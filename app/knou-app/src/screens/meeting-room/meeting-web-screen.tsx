import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  showAppAlert,
  type AppAlertButtonStyle,
  type AppAlertIconTone,
} from '@/components/ui/app-alert';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore, useMeetingStore } from '@/store';
import type { BackendLang, LangCode } from '@/types/meeting';
import { fromBackendLang } from '@/types/meeting';
import { API_BASE } from '@/lib/config';
import { LiveStt } from '@/lib/stt/live-stt';
import { speakMessage, stopSpeaking } from '@/lib/tts';
import { useProfile } from '@/screens/settings/hooks';
import { leaveMeeting } from './api';
import { useMeetingSession } from './hooks';

/**
 * 회의 진행 화면 — 백엔드가 서빙하는 웹 페이지(templates/meeting-room.html)를
 * 인라인 WebView(react-native-webview)로 페이지 안에 임베드한다.
 *
 * ⚠️ 왜 네이티브가 아니라 웹인가:
 *   RN(Android) 의 WebSocket 이 STOMP NULL 프레임을 누락해 실시간 채팅 연결이 불안정하다.
 *   브라우저(stompjs + SockJS)에서는 정상 동작하므로 회의 UI 를 웹으로 옮겼다.
 *
 * 역할 분담:
 *   - 웹 페이지: STOMP 채팅/presence/종료 + **WebRTC Mesh 음성통화** (getUserMedia + /signal)
 *   - 네이티브 브리지: STT·TTS + **공통 AppAlert** (웹 `alert`/`confirm` 대신 앱 디자인 다이얼로그)
 *
 * ⚠️ react-native-webview 는 네이티브 모듈 — OTA(JS만 교체)로는 배포되지 않고 앱 재빌드가 필요하다.
 *   meeting-room.html 변경은 백엔드 배포만으로 반영된다.
 *
 * 종료/나가기 복귀: 웹 페이지가 딥링크(knouapp://meeting-done?type=…)로 이동을 시도하면
 *   onShouldStartLoadWithRequest 가 이를 가로채(→ 페이지는 그대로) 요약 이동/나가기 처리.
 */

/** Android: WebView getUserMedia 전에 RECORD_AUDIO 를 미리 확보 (WebChromeClient 권한 프롬프트 안정화). */
async function ensureAndroidMicPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (granted) return;
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: '마이크 권한',
      message: '회의 중 음성 대화를 위해 마이크 접근이 필요합니다.',
      buttonPositive: '허용',
      buttonNegative: '거부',
    });
  } catch (e) {
    console.warn('[meeting-web] 마이크 권한 요청 실패', e);
  }
}

/** 웹 페이지가 회의 종료·나가기 시 이동을 시도할 딥링크. (WebView 가 내비게이션을 가로챈다) */
const RETURN_URL = makeRedirectUri({ scheme: 'knouapp', path: 'meeting-done' });

/** 웹 헤더(.header)와 같은 색 — 상태바 영역이 헤더와 이어져 보이도록. */
const HEADER_NAVY = '#16305C';

export function MeetingWebScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { code, meetingId: meetingIdParam } = useLocalSearchParams<{ code?: string; meetingId?: string }>();
  const meetingId = meetingIdParam ? Number(meetingIdParam) : null;

  const { inMeeting } = useMeetingSession();
  const startMeeting = useMeetingStore((s) => s.startMeeting);
  const clearMeeting = useMeetingStore((s) => s.clearMeeting);
  const clearActiveMeeting = useMeetingStore((s) => s.clearActiveMeeting);
  const activeMeeting = useMeetingStore((s) => s.activeMeeting);
  const user = useAuthStore((s) => s.user);
  const backendUserId = useAuthStore((s) => s.backendUserId);
  const backendToken = useAuthStore((s) => s.backendToken);
  const { data: profile } = useProfile();

  // 같은 방은 1회만 세션 시작(탭 활성/진행중 표시용). 다른 방으로 바뀌면 재초기화.
  const startedMeetingRef = useRef<number | null>(null);
  // 종료/나가기 처리를 1회만 실행하기 위한 가드.
  const doneRef = useRef(false);
  // 웹 페이지에 STT 결과를 주입하기 위한 WebView 핸들.
  const webRef = useRef<WebView>(null);
  // 진행 중인 네이티브 STT 세션 (웹 페이지의 마이크 토글이 브리지로 제어).
  const sttRef = useRef<LiveStt | null>(null);

  const stopStt = () => {
    sttRef.current?.stop();
    sttRef.current = null;
  };

  /** 웹 → 네이티브 alert 결과를 페이지 콜백으로 돌려준다. */
  const replyAlert = (requestId: string, key: string | null) => {
    webRef.current?.injectJavaScript(
      `window.__alertResult && window.__alertResult(${JSON.stringify(requestId)}, ${JSON.stringify(key)}); true;`,
    );
  };

  // 웹 페이지의 STT/TTS/Alert 위임 — Android WebView 는 Web Speech 미지원, 시스템 alert 디자인도 제각각.
  const onMessage = (e: WebViewMessageEvent) => {
    let msg: {
      type?: string;
      text?: string;
      lang?: string;
      requestId?: string;
      title?: string;
      message?: string;
      cancelable?: boolean;
      icon?: string;
      iconTone?: string;
      buttons?: { key?: string; text?: string; style?: string }[];
    };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    switch (msg.type) {
      case 'tts':
        if (msg.text) speakMessage(msg.text, (msg.lang as BackendLang) ?? null);
        break;
      case 'tts-stop':
        stopSpeaking();
        break;
      case 'stt-start': {
        stopStt();
        const stt = new LiveStt({
          lang: (msg.lang as LangCode) ?? 'ko',
          // 확정 문장을 웹 페이지에 주입 → 페이지가 STOMP 로 발행(source: STT)
          onFinal: (text) =>
            webRef.current?.injectJavaScript(
              `window.__sttFinal && window.__sttFinal(${JSON.stringify(text)}); true;`,
            ),
        });
        sttRef.current = stt;
        void stt.start().then((granted) => {
          if (!granted) {
            sttRef.current = null;
            webRef.current?.injectJavaScript('window.__sttDenied && window.__sttDenied(); true;');
          }
        });
        break;
      }
      case 'stt-stop':
        stopStt();
        break;
      case 'alert': {
        // 웹 페이지 공통 AppAlert 브리지 (title/message/buttons → 네이티브 카드 UI)
        const requestId = msg.requestId ?? '';
        if (!requestId) break;
        void showAppAlert({
          title: msg.title ?? '',
          message: msg.message || undefined,
          cancelable: msg.cancelable !== false,
          icon: msg.icon as Parameters<typeof showAppAlert>[0]['icon'],
          iconTone: (msg.iconTone as AppAlertIconTone) || undefined,
          buttons: (msg.buttons ?? [{ key: 'ok', text: '확인', style: 'primary' }]).map((b) => ({
            key: b.key ?? b.text ?? 'ok',
            text: b.text ?? '확인',
            style: (b.style as AppAlertButtonStyle) || 'default',
          })),
        }).then((key) => replyAlert(requestId, key));
        break;
      }
    }
  };

  // 화면을 떠날 때(언마운트) STT/TTS 정리. (WebRTC 는 웹 pagehide 에서 stop)
  useEffect(() => () => {
    sttRef.current?.stop();
    sttRef.current = null;
    stopSpeaking();
  }, []);

  useEffect(() => {
    if (meetingId !== null && startedMeetingRef.current !== meetingId) {
      startedMeetingRef.current = meetingId;
      doneRef.current = false;
      startMeeting(code ?? '');
      // WebRTC getUserMedia 가 바로 뜰 수 있도록 Android 마이크 권한 선요청
      void ensureAndroidMicPermission();
    }
  }, [meetingId, code, startMeeting]);

  // 회의실 URL — 진행에 필요한 값 전부 쿼리로 전달(+ 복귀 딥링크).
  const uri = useMemo(() => {
    if (meetingId === null) return null;
    const lang = profile ? fromBackendLang(profile.language) : 'ko';
    const params = new URLSearchParams({
      meetingId: String(meetingId),
      code: code ?? '',
      name: user?.name ?? '나',
      userId: String(backendUserId ?? 0),
      host: activeMeeting?.host ? '1' : '0',
      lang,
      returnUrl: RETURN_URL,
    });
    if (backendToken) params.set('token', backendToken);
    return `${API_BASE}/meeting-room?${params.toString()}`;
  }, [meetingId, code, user?.name, backendUserId, activeMeeting?.host, backendToken, profile]);

  // 종료(개설자/원격) — 스토어 정리 후 요약(상세)으로. remote=개설자가 종료한 경우.
  const finishLocally = (remote: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopStt();
    stopSpeaking();
    // 재입장 시 세션을 새로 시작할 수 있도록 초기화 (탭 화면은 언마운트되지 않음)
    startedMeetingRef.current = null;
    clearActiveMeeting();
    clearMeeting();
    qc.invalidateQueries({ queryKey: ['recent-meetings'] });
    qc.invalidateQueries({ queryKey: ['meetings'] });
    const goSummary = () => {
      if (meetingId !== null) {
        router.replace({ pathname: '/notes/[id]', params: { id: String(meetingId), fresh: '1' } });
      } else {
        router.replace('/(tabs)');
      }
    };
    if (remote) {
      void showAppAlert({
        title: '회의가 종료되었어요',
        message: '개설자가 회의를 종료했습니다. 회의 요약을 확인해 보세요.',
        cancelable: false,
        buttons: [{ key: 'ok', text: '요약 보기', style: 'primary' }],
      }).then(() => goSummary());
    } else {
      goSummary();
    }
  };

  // 참여자 나가기 — 서버 참석 해제(use_yn=N) 완료 후 홈으로.
  // ⚠️ leave 를 await 하지 않으면 홈 hydrate(GET /active) 가 이전 방을 다시 심어
  //    하단 「회의」 탭이 옛 방으로 재입장시키는 버그가 난다.
  const leaveAndGoHome = async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopStt();
    stopSpeaking();
    // 탭 화면은 언마운트되지 않으므로 세션/진행중 상태를 먼저 비운다
    startedMeetingRef.current = null;
    clearMeeting();
    clearActiveMeeting();

    if (meetingId !== null) {
      try {
        await leaveMeeting(meetingId);
      } catch (e) {
        console.warn('[meeting] 나가기 실패 — 한 번 더 시도', e);
        try {
          await leaveMeeting(meetingId);
        } catch (e2) {
          console.warn('[meeting] 나가기 재시도 실패', e2);
        }
      }
    }

    // 서버 반영 뒤 캐시/스토어를 다시 비워 hydrate 레이스를 막는다
    clearActiveMeeting();
    qc.invalidateQueries({ queryKey: ['active-meeting'] });
    router.replace('/(tabs)');
  };

  // 나가기 확인 — 안 나가기면 no-op. 딥링크는 가로채므로 웹 회의 페이지는 그대로 유지.
  const promptLeave = () => {
    void showAppAlert({
      title: '회의에서 나가기',
      message: '회의에서 나가시겠어요?',
      cancelable: true,
      buttons: [
        { key: 'stay', text: '안 나가기', style: 'cancel' },
        { key: 'leave', text: '나가기', style: 'destructive' },
      ],
    }).then((key) => {
      if (key === 'leave') void leaveAndGoHome();
    });
  };

  // 웹 페이지의 딥링크(knouapp://meeting-done?type=…) 이동을 가로채 종료/나가기 분기.
  // false 를 반환해 실제 내비게이션은 막는다(WebView 는 회의 페이지에 그대로 남음).
  const onShouldStartLoad = useCallback(
    (req: ShouldStartLoadRequest) => {
      if (!req.url.startsWith('knouapp://')) return true;
      const { queryParams } = Linking.parse(req.url);
      const type = typeof queryParams?.type === 'string' ? queryParams.type : '';
      const remote = queryParams?.remote === '1';
      if (type === 'ended') finishLocally(remote);
      else if (type === 'left') promptLeave();
      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meetingId],
  );

  // 나가기/종료 후 inMeeting=false 인데 URL params(meetingId) 가 남는 경우가 있다
  // (탭 스크린 유지). 무한 로딩 대신 빈 안내로 보내고, 새 회의는 홈/회의 탭에서 연다.
  if (!inMeeting || meetingId === null) return <NoMeetingState />;

  // 세션 시작 직전(uri 조립 전) 짧은 로딩
  if (!uri) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      </ThemedView>
    );
  }

  return (
    // 상태바 영역을 웹 헤더와 같은 네이비로 채워 페이지에 박힌 한 화면처럼 보이게 한다.
    // (Android WebView 는 env(safe-area-inset-top)=0 이라 여기서 패딩을 준다)
    <View style={[styles.container, { backgroundColor: HEADER_NAVY, paddingTop: insets.top }]}>
      <WebView
        ref={webRef}
        key={uri}
        source={{ uri }}
        style={styles.web}
        originWhitelist={['*']}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStartLoad}
        setSupportMultipleWindows={false}
        domStorageEnabled
        // WebRTC 음성: getUserMedia 마이크 + 원격 오디오 자동재생
        // (Android 는 RECORD_AUDIO 매니페스트 + WebChromeClient onPermissionRequest 로 처리)
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
        javaScriptEnabled
        // 일부 Android WebView 는 하드웨어 가속이 있어야 WebRTC 디코딩이 안정적
        androidLayerType="hardware"
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.loading, StyleSheet.absoluteFill]}>
            <ActivityIndicator />
          </View>
        )}
      />
    </View>
  );
}

/** 진행 중인 회의 없이 「회의」 탭 직접 진입 시 안내. */
function NoMeetingState() {
  const router = useRouter();
  const colors = useTheme();
  return (
    <ThemedView style={styles.emptyContainer}>
      <SafeAreaView style={styles.emptyInner}>
        <Feather name="mic-off" size={40} color={colors.textSecondary} />
        <ThemedText type="smallBold" style={styles.emptyTitle}>
          진행 중인 회의가 없습니다
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
          홈에서 새 회의를 시작하거나 코드로 참여하세요.
        </ThemedText>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
          style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="홈으로"
        >
          <ThemedText style={styles.emptyBtnText}>홈으로</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: { flex: 1 },
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: { marginTop: Spacing.two, fontSize: 16 },
  emptyDesc: { textAlign: 'center' },
  emptyBtn: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  emptyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});

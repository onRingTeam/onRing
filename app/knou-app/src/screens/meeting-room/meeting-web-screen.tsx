import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore, useMeetingStore } from '@/store';
import { fromBackendLang } from '@/types/meeting';
import { API_BASE } from '@/lib/config';
import { useProfile } from '@/screens/settings/hooks';
import { leaveMeeting } from './api';
import { useMeetingSession } from './hooks';

/**
 * 회의 진행 화면 — 백엔드가 서빙하는 웹 페이지(templates/meeting-room.html)를 WebView 로 로드한다.
 *
 * ⚠️ 왜 네이티브가 아니라 WebView 인가:
 *   RN(Android) 의 WebSocket 이 STOMP NULL 프레임을 누락해 실시간 채팅 연결이 불안정하다.
 *   브라우저(stompjs + SockJS)에서는 정상 동작하므로, 채팅·자막·참여자 UI 만 웹으로 옮겨
 *   WebView 로 띄운다. (STT·WebRTC 음성통화는 이 웹 버전에서 제외)
 *
 * 페이지 → 앱 브리지(postMessage):
 *   { type: 'ended', remote } — 회의 종료. remote=true 면 개설자가 종료한 것.
 *   앱은 스토어를 정리하고 요약(상세) 화면으로 이동한다.
 */
export function MeetingWebScreen() {
  const router = useRouter();
  const qc = useQueryClient();
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
  const endedRef = useRef(false);
  useEffect(() => {
    if (meetingId !== null && startedMeetingRef.current !== meetingId) {
      startedMeetingRef.current = meetingId;
      endedRef.current = false;
      startMeeting(code ?? '');
    }
  }, [meetingId, code, startMeeting]);

  // 로컬 종료 처리(스토어 정리 + 요약 화면 이동). 내가 종료했든 개설자 종료 알림을 받았든 공통.
  const finishLocally = (remote: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
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
      Alert.alert(
        '회의가 종료되었어요',
        '개설자가 회의를 종료했습니다. 회의 요약을 확인해 보세요.',
        [{ text: '요약 보기', onPress: goSummary }],
        { cancelable: false, onDismiss: goSummary },
      );
    } else {
      goSummary();
    }
  };

  // WebView 로 넘길 URL — 회의 진행에 필요한 값 전부 쿼리로 전달.
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
    });
    if (backendToken) params.set('token', backendToken);
    return `${API_BASE}/meeting-room?${params.toString()}`;
  }, [meetingId, code, user?.name, backendUserId, activeMeeting?.host, backendToken, profile]);

  // 참여자 나가기 — 회의는 계속되므로 요약이 아니라 홈으로. (요약 이동과 겹치지 않게 endedRef 로 가드)
  //  willRejoin=true : 진행중 회의 상태 유지 → 홈에서 "재입장" 가능. 서버 호출 없음.
  //  willRejoin=false: 서버 나가기(use_yn=N)로 진행중 회의에서 제외 → 홈에서 새 회의 개설 가능.
  // 어느 쪽이든 홈으로 이동하면 WebView 언마운트 → STOMP 연결 종료 → presence 자동 정리.
  const leaveAndGoHome = (willRejoin: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearMeeting();
    if (!willRejoin) {
      clearActiveMeeting();
      if (meetingId !== null) {
        leaveMeeting(meetingId).catch((e) => console.warn('[meeting] 나가기 실패', e));
      }
      qc.invalidateQueries({ queryKey: ['active-meeting'] });
    }
    router.replace('/(tabs)');
  };

  // 나가기 요청 → 재참여 여부를 물어본다. 취소하면 아무것도 하지 않아 회의가 그대로 유지된다.
  const promptLeave = () => {
    Alert.alert(
      '회의에서 나가기',
      '나중에 이 회의에 다시 참여하실 건가요?',
      [
        { text: '취소', style: 'cancel' },
        { text: '재참여 안 함', style: 'destructive', onPress: () => leaveAndGoHome(false) },
        { text: '재참여할게요', onPress: () => leaveAndGoHome(true) },
      ],
      { cancelable: true },
    );
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data) as { type?: string; remote?: boolean };
      if (data.type === 'ended') finishLocally(!!data.remote);
      else if (data.type === 'left') promptLeave();
    } catch {
      /* 무시 — 페이지가 보내는 JSON 만 처리 */
    }
  };

  // 진행 중인 회의 없이 「회의」 탭 직접 진입 → 안내
  if (meetingId === null && !inMeeting) return <NoMeetingState />;
  if (!uri) return <NoMeetingState />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <WebView
          source={{ uri }}
          onMessage={onMessage}
          // 페이지 내부에서 자체 UI·스크롤을 처리하므로 바운스/줌 비활성
          bounces={false}
          overScrollMode="never"
          // 마이크 등 미디어 권한 프롬프트 불필요(채팅 전용). 키보드가 입력창 가리지 않게.
          keyboardDisplayRequiresUserAction={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator />
            </View>
          )}
        />
      </SafeAreaView>
    </ThemedView>
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
  flex: { flex: 1 },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
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

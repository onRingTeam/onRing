import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
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
 * 회의 진행 화면 — 백엔드가 서빙하는 웹 페이지(templates/meeting-room.html)를
 * 인앱 브라우저(expo-web-browser)로 연다.
 *
 * ⚠️ 왜 네이티브가 아니라 웹인가:
 *   RN(Android) 의 WebSocket 이 STOMP NULL 프레임을 누락해 실시간 채팅 연결이 불안정하다.
 *   브라우저(stompjs + SockJS)에서는 정상 동작하므로, 채팅·자막·참여자 UI 만 웹으로 옮겼다.
 *
 * ⚠️ 왜 react-native-webview 가 아니라 expo-web-browser 인가:
 *   react-native-webview 는 네이티브 모듈이라 OTA(JS만 교체)로 배포되지 않아 앱 재빌드가 필요하다.
 *   expo-web-browser 는 이미 설치·빌드돼 있어(로그인 플로우와 동일) OTA 만으로 배포된다.
 *
 * 종료/나가기 복귀: 웹 페이지가 딥링크(knouapp://meeting-done?type=…)로 리다이렉트하면
 *   openAuthSessionAsync 가 이를 가로채 resolve → 여기서 요약 이동/나가기 처리.
 */

/** 웹 페이지가 회의 종료·나가기 후 돌아올 딥링크. (OAuth 콜백과 동일 메커니즘) */
const RETURN_URL = makeRedirectUri({ scheme: 'knouapp', path: 'meeting-done' });

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
  // 종료/나가기 처리를 1회만 실행하기 위한 가드.
  const doneRef = useRef(false);
  // 브라우저를 1회만 자동으로 열기 위한 가드.
  const openedRef = useRef(false);

  useEffect(() => {
    if (meetingId !== null && startedMeetingRef.current !== meetingId) {
      startedMeetingRef.current = meetingId;
      doneRef.current = false;
      openedRef.current = false;
      startMeeting(code ?? '');
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

  // 참여자 나가기 — 회의는 계속되므로 홈으로.
  //  willRejoin=true : 진행중 상태 유지 → 홈에서 "재입장" 가능. 서버 호출 없음.
  //  willRejoin=false: 서버 나가기(use_yn=N)로 진행중 회의에서 제외 → 홈에서 새 회의 개설 가능.
  const leaveAndGoHome = (willRejoin: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearMeeting();
    if (!willRejoin) {
      clearActiveMeeting();
      if (meetingId !== null) leaveMeeting(meetingId).catch((e) => console.warn('[meeting] 나가기 실패', e));
      qc.invalidateQueries({ queryKey: ['active-meeting'] });
    }
    router.replace('/(tabs)');
  };

  // 나가기 요청 → 재참여 여부 확인. 취소하면 회의는 그대로(홈 이동만 취소).
  const promptLeave = () => {
    Alert.alert(
      '회의에서 나가기',
      '나중에 이 회의에 다시 참여하실 건가요?',
      [
        { text: '취소', style: 'cancel', onPress: goHomeKeepActive },
        { text: '재참여 안 함', style: 'destructive', onPress: () => leaveAndGoHome(false) },
        { text: '재참여할게요', onPress: () => leaveAndGoHome(true) },
      ],
      { cancelable: true, onDismiss: goHomeKeepActive },
    );
  };

  // 브라우저를 그냥 닫음(X) — 회의는 유지, 홈으로. 진행중 상태는 남겨 재입장 가능.
  function goHomeKeepActive() {
    if (doneRef.current) return;
    doneRef.current = true;
    clearMeeting();
    router.replace('/(tabs)');
  }

  // 회의실 열기 — 딥링크 복귀를 openAuthSessionAsync 로 가로채 종료/나가기 분기.
  const openRoom = useCallback(async () => {
    if (!uri) return;
    try {
      const result = await WebBrowser.openAuthSessionAsync(uri, RETURN_URL);
      if (result.type === 'success' && result.url) {
        const { queryParams } = Linking.parse(result.url);
        const type = typeof queryParams?.type === 'string' ? queryParams.type : '';
        const remote = queryParams?.remote === '1';
        if (type === 'ended') finishLocally(remote);
        else if (type === 'left') promptLeave();
        else goHomeKeepActive();
      } else {
        // dismiss/cancel — 사용자가 브라우저를 닫음.
        goHomeKeepActive();
      }
    } catch (e) {
      console.warn('[meeting] 회의실 열기 실패', e);
      goHomeKeepActive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  // 진입 시 1회 자동으로 회의실(브라우저)을 연다.
  useEffect(() => {
    if (!uri || openedRef.current) return;
    openedRef.current = true;
    void openRoom();
  }, [uri, openRoom]);

  // 진행 중인 회의 없이 「회의」 탭 직접 진입 → 안내
  if (meetingId === null && !inMeeting) return <NoMeetingState />;

  // 브라우저가 앞에 떠 있는 동안 뒤에 보이는 대기 화면 (닫혔을 때 다시 열기 제공)
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.waitingInner}>
        <ActivityIndicator />
        <ThemedText type="smallBold" style={styles.waitingTitle}>
          회의 진행 중
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.waitingDesc}>
          회의는 별도 창에서 진행됩니다. 창이 닫혔다면 아래에서 다시 열 수 있어요.
        </ThemedText>
        <ReopenButton onPress={openRoom} />
      </SafeAreaView>
    </ThemedView>
  );
}

function ReopenButton({ onPress }: { onPress: () => void }) {
  const colors = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.reopenBtn, { backgroundColor: colors.primary }]}
      accessibilityRole="button"
      accessibilityLabel="회의실 다시 열기"
    >
      <ThemedText style={styles.reopenText}>회의실 다시 열기</ThemedText>
    </TouchableOpacity>
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
  waitingInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  waitingTitle: { marginTop: Spacing.two, fontSize: 16 },
  waitingDesc: { textAlign: 'center' },
  reopenBtn: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  reopenText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
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

import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore, useMeetingStore } from '@/store';
import type { LangCode } from '@/types/meeting';
import { fromBackendLang, toBackendLang } from '@/types/meeting';
import { useProfile } from '@/screens/settings/hooks';
import { MeetingHeader } from './components/meeting-header';
import { LanguageBar } from './components/language-bar';
import { CaptionStream } from './components/caption-stream';
import { ChatInputBar } from './components/chat-input-bar';
import { useEndMeeting, useMeetingConnection, useMeetingSession } from './hooks';

export function MeetingScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  // meetingId: 회의 생성/참여 API 응답값. code: 표시·공유용 회의 코드.
  const { code, meetingId: meetingIdParam } = useLocalSearchParams<{ code?: string; meetingId?: string }>();
  const meetingId = meetingIdParam ? Number(meetingIdParam) : null;
  const { inMeeting, captions, elapsed, endMeeting } = useMeetingSession();
  const endMutation = useEndMeeting();
  const startMeeting = useMeetingStore((s) => s.startMeeting);
  const clearActiveMeeting = useMeetingStore((s) => s.clearActiveMeeting);
  const participants = useMeetingStore((s) => s.participants);
  const activeMeeting = useMeetingStore((s) => s.activeMeeting);
  const user = useAuthStore((s) => s.user);
  const backendUserId = useAuthStore((s) => s.backendUserId);

  // 내 발화 언어 — 기본값은 유저 프로필 언어, 언어 바에서 회의 중 변경 가능.
  // 선택값이 STT 인식·전송 lang·수신 번역 타깃의 단일 소스.
  const { data: profile } = useProfile();
  const [selectedLang, setSelectedLang] = useState<LangCode | null>(null);
  const myLang: LangCode = selectedLang ?? (profile ? fromBackendLang(profile.language) : 'ko');
  // 이미 세션을 시작한 회의 id. 새 meetingId 로 들어오면 세션(자막·참여자·타이머)을 새로 초기화한다.
  const startedMeetingRef = useRef<number | null>(null);
  const streamRef = useRef<ScrollView>(null);

  // 실제 회의(meetingId 있음)로 진입 시 세션 시작. 같은 방에선 1회, 다른 방으로 바뀌면 재초기화한다.
  // captions 는 방별로 구분되지 않는 전역 상태라, 여기서 meetingId 가 바뀔 때마다 비워야
  // 이전 회의가 깔끔히 정리되지 않았어도(=inMeeting 잔존) 새 방에 옛 자막이 남지 않는다.
  // meetingId 기준이라 종료 후 store 가 비워져도(같은 id) 재실행되지 않아 회의가 되살아나지 않는다.
  useEffect(() => {
    if (meetingId !== null && startedMeetingRef.current !== meetingId) {
      startedMeetingRef.current = meetingId;
      startMeeting(code ?? '');
    }
  }, [meetingId, code, startMeeting]);

  // 로컬 종료 처리(스토어 정리 + 요약 화면 이동). 내가 종료했든 개설자 종료 알림을 받았든 공통.
  // STOMP 알림과 내 종료가 겹쳐도 1회만 실행되도록 가드.
  const endedRef = useRef(false);
  const finishLocally = (remote = false) => {
    if (endedRef.current) return;
    endedRef.current = true;
    // 종료 시점에 스토어 진행중 회의 상태 해제 (홈/회의탭 즉시 정합).
    clearActiveMeeting();
    endMeeting(captions);
    // 참여자(비개설자)도 방금 종료된 회의가 홈 최근 회의·회의록에 바로 뜨도록 목록 캐시 무효화.
    qc.invalidateQueries({ queryKey: ['recent-meetings'] });
    qc.invalidateQueries({ queryKey: ['meetings'] });
    // 종료 후엔 회의화면을 벗어나 상세(요약)로 이동. fresh=1 로 요약 생성 완료까지 폴링.
    // meetingId 가 없으면(비정상) 홈으로 폴백.
    const goSummary = () => {
      if (meetingId !== null) {
        router.replace({ pathname: '/notes/[id]', params: { id: String(meetingId), fresh: '1' } });
      } else {
        router.replace('/(tabs)');
      }
    };
    // 상대방(개설자)이 종료한 경우엔 참여자에게 종료 사실을 알리고, 확인 시 요약으로 이동.
    // 내가 직접 누른 종료는 알림 없이 바로 이동.
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

  // 회의 화면이 켜져 있는 동안만 STOMP 연결 (채팅 + presence + WebRTC 시그널링 + 종료 알림) & 음성통화
  const { send, setMicEnabled } = useMeetingConnection(
    meetingId,
    backendUserId ?? 0,
    user?.name ?? '나',
    myLang,
    // 원격 종료(개설자가 종료 → STOMP 알림/재확인) 경로 — 알림 띄우고 요약으로 이동
    () => finishLocally(true),
  );

  const handleSend = (text: string) => {
    // source: CHAT — 수신 측에서 TTS 로 읽어줌 (STT 발화와 구분)
    send({
      senderId: backendUserId ?? 0,
      senderName: user?.name ?? '나',
      message: text,
      lang: toBackendLang(myLang),
      source: 'CHAT',
    });
  };

  const handleEnd = () => {
    // 내가 누른 종료 — 로컬 정리+상세 이동을 먼저 확정한다(endedRef 선점).
    // POST /end 응답보다 서버의 종료(ENDED) 브로드캐스트가 내 소켓으로 먼저 되돌아와도
    // '참여자용 종료 알럿'(finishLocally(true)) 경로를 타지 않고 곧바로 상세로 이동한다.
    finishLocally();
    // 서버 종료 요청은 백그라운드로 (개설자만 성공, 그 외/이미 종료는 무시하고 로컬은 이미 정리됨).
    if (meetingId !== null) {
      endMutation.mutate(meetingId, {
        onError: (e) => console.warn('[meeting] 종료 실패(개설자 아님이거나 이미 종료)', e),
      });
    }
  };

  // presence가 오기 전에도 본인은 항상 보이도록 (서버 목록에 내 이름 있으면 중복 제거)
  const myName = user?.name ?? '나';
  const displayParticipants = participants.includes(myName)
    ? participants
    : [myName, ...participants];

  // 진행 중인 회의 없이 「회의」 탭으로 직접 진입 → 안내(가짜 빈 회의 방지)
  if (meetingId === null && !inMeeting) {
    return <NoMeetingState />;
  }

  return (
    <ThemedView style={styles.container}>
      <MeetingHeader
        title="회의 진행"
        code={code}
        elapsed={elapsed}
        participants={displayParticipants}
        // 종료는 개설자 전용 (host=false 참여자에게는 버튼 미노출)
        onEnd={activeMeeting?.host ? handleEnd : undefined}
      />

      <LanguageBar selected={myLang} onSelect={setSelectedLang} />

      <ScrollView
        ref={streamRef}
        style={styles.stream}
        contentContainerStyle={styles.streamContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => streamRef.current?.scrollToEnd({ animated: true })}
      >
        <CaptionStream captions={captions} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerInner}>
          <ChatInputBar onSend={handleSend} onMicToggle={setMicEnabled} />
        </View>
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
  stream: { flex: 1 },
  streamContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26, 52, 97, 0.1)',
  },
  footerInner: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
});

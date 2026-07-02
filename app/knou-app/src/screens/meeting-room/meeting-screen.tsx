import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore, useMeetingStore } from '@/store';
import type { LangCode } from '@/types/meeting';
import { toBackendLang } from '@/types/meeting';
import { MeetingHeader } from './components/meeting-header';
import { LanguageBar } from './components/language-bar';
import { CaptionStream } from './components/caption-stream';
import { ChatInputBar } from './components/chat-input-bar';
import { useMeetingConnection, useMeetingSession } from './hooks';

export function MeetingScreen() {
  const router = useRouter();
  // meetingId: 회의 생성/참여 API 응답값. code: 표시·공유용 회의 코드.
  const { code, meetingId: meetingIdParam } = useLocalSearchParams<{ code?: string; meetingId?: string }>();
  const meetingId = meetingIdParam ? Number(meetingIdParam) : null;
  const { inMeeting, captions, elapsed, endMeeting } = useMeetingSession();
  const startMeeting = useMeetingStore((s) => s.startMeeting);
  const participants = useMeetingStore((s) => s.participants);
  const user = useAuthStore((s) => s.user);

  const [myLang, setMyLang] = useState<LangCode>('en');

  // 실제 회의(meetingId 있음)로 들어온 경우에만 세션 시작. (회의 탭 직접 진입 = 가짜 회의 방지)
  useEffect(() => {
    if (meetingId !== null && !inMeeting) startMeeting(code ?? '');
  }, [meetingId, inMeeting, code, startMeeting]);

  // 회의 화면이 켜져 있는 동안만 STOMP 연결 (채팅 + presence + WebRTC 시그널링) & 음성통화
  const { send, setMicEnabled } = useMeetingConnection(meetingId, user?.name ?? '나');

  const handleSend = (text: string) => {
    send({ senderName: user?.name ?? '나', message: text, lang: toBackendLang(myLang) });
  };

  const handleEnd = () => {
    endMeeting(captions);
    router.back();
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
        onEnd={handleEnd}
      />

      <LanguageBar selected={myLang} onSelect={setMyLang} />

      <ScrollView
        style={styles.stream}
        contentContainerStyle={styles.streamContent}
        showsVerticalScrollIndicator={false}
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

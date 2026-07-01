import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useMeetingStore } from '@/store';
import type { LangCode } from '@/types/meeting';
import { MeetingHeader } from './components/meeting-header';
import { LanguageBar } from './components/language-bar';
import { CaptionStream } from './components/caption-stream';
import { ChatInputBar } from './components/chat-input-bar';
import { useMeetingSession } from './hooks';
import { MOCK_CAPTIONS, MOCK_SPEAKERS } from './mock-data';

export function MeetingScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { inMeeting, captions, elapsed, endMeeting } = useMeetingSession();
  const startMeeting = useMeetingStore((s) => s.startMeeting);

  const [myLang, setMyLang] = useState<LangCode>('en');

  // 진행 중인 회의가 없으면 참여 코드로 세션 시작
  useEffect(() => {
    if (!inMeeting) startMeeting(code ?? '');
  }, [inMeeting, code, startMeeting]);

  const handleEnd = () => {
    endMeeting(captions);
    router.back();
  };

  // 실제 자막이 없으면 시연용 목업 표시
  const displayCaptions = captions.length > 0 ? captions : MOCK_CAPTIONS;
  const title = code ? `회의 · ${code}` : '스프린트 플래닝 #13';

  return (
    <ThemedView style={styles.container}>
      <MeetingHeader
        title={title}
        elapsed={elapsed}
        speakers={MOCK_SPEAKERS}
        onEnd={handleEnd}
      />

      <LanguageBar selected={myLang} onSelect={setMyLang} />

      <ScrollView
        style={styles.stream}
        contentContainerStyle={styles.streamContent}
        showsVerticalScrollIndicator={false}
      >
        <CaptionStream captions={displayCaptions} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerInner}>
          <ChatInputBar />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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

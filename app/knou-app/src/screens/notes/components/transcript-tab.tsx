import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MeetingMessageDto } from '@/types/meeting';
import { SPEAKER_COLORS } from './summary-tab';

export interface TranscriptTabProps {
  messages: MeetingMessageDto[];
  isLoading: boolean;
  isError: boolean;
}

/** ISO LocalDateTime("2026-06-26T14:05:12") → "14:05". 서버가 KST 로 내려주므로 변환 불필요. */
function formatSpokenAt(spokenAt: string): string {
  return spokenAt.slice(11, 16);
}

/**
 * 상세회의 '전체 대화' 탭 — 발화자·시간·원문 조회. (화면정의서 4-d)
 * 번역문은 표시하지 않고, 메시지마다 '번역' 버튼(예정 기능)만 노출한다.
 */
export function TranscriptTab({ messages, isLoading, isError }: TranscriptTabProps) {
  const colors = useTheme();

  // 발화자별 색상 배정 — 등장 순서대로 팔레트 순환 (같은 화자는 같은 색).
  const colorByUser = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of messages) {
      if (!map.has(m.userId)) map.set(m.userId, SPEAKER_COLORS[map.size % SPEAKER_COLORS.length]);
    }
    return map;
  }, [messages]);

  if (isLoading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.state}>
        <ThemedText type="small" themeColor="textSecondary">
          대화를 불러오지 못했습니다.
        </ThemedText>
      </View>
    );
  }
  if (messages.length === 0) {
    return (
      <View style={styles.state}>
        <ThemedText type="small" themeColor="textSecondary">
          저장된 대화가 없습니다.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {messages.map((m) => (
        <View key={m.messageId} style={styles.item}>
          <View style={styles.rowTop}>
            <View style={[styles.avatar, { backgroundColor: colorByUser.get(m.userId) }]}>
              <ThemedText style={styles.avatarText}>{m.speakerName.charAt(0)}</ThemedText>
            </View>
            <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
              {m.speakerName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatSpokenAt(m.spokenAt)}
            </ThemedText>
          </View>

          <View style={[styles.bubble, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <ThemedText type="small" style={styles.original}>
              {m.original}
            </ThemedText>
            {/* 실시간 번역 — 예정 기능 (구현 전까지 UI 만 노출). */}
            <TouchableOpacity
              style={styles.translateBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="번역"
              // TODO: 온디바이스 번역(@/lib/translate) 연결 예정
              onPress={() => {}}
            >
              <Feather name="globe" size={13} color={colors.accent} />
              <ThemedText type="small" style={[styles.translateText, { color: colors.accent }]}>
                번역
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  list: {
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  item: {
    gap: Spacing.two,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  name: {
    flex: 1,
  },
  bubble: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  original: {
    lineHeight: 20,
  },
  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-end',
  },
  translateText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

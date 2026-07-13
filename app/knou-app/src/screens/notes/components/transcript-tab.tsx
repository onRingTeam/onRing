import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { translate } from '@/lib/translate';
import { useSettingsStore } from '@/store';
import type { MeetingMessageDto } from '@/types/meeting';
import { SPEAKER_COLORS } from './summary-tab';

/** 메시지별 번역 상태. done=번역 시도 완료(결과 null 이어도 true), shown=표시 토글. */
interface TransState {
  loading: boolean;
  text: string | null;
  shown: boolean;
  done: boolean;
}

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
 * 메시지마다 '번역' 버튼 → 설정에서 고른 언어(myLanguage)로 온디바이스 번역(@/lib/translate).
 */
export function TranscriptTab({ messages, isLoading, isError }: TranscriptTabProps) {
  const colors = useTheme();

  // 번역 대상 언어 = 설정에서 고른 내 언어(스토어 관리).
  const targetLang = useSettingsStore((s) => s.myLanguage);
  const [trans, setTrans] = useState<Record<number, TransState>>({});

  // 설정 언어가 바뀌면 기존 번역 캐시는 무효 → 초기화.
  useEffect(() => {
    setTrans({});
  }, [targetLang]);

  const onTranslate = useCallback(
    async (m: MeetingMessageDto) => {
      const cur = trans[m.messageId];
      if (cur?.loading) return; // 진행 중 재요청 무시
      if (cur?.done) {
        // 이미 번역함 → 표시/숨김만 토글
        setTrans((p) => ({ ...p, [m.messageId]: { ...cur, shown: !cur.shown } }));
        return;
      }
      setTrans((p) => ({ ...p, [m.messageId]: { loading: true, text: null, shown: true, done: false } }));
      const result = await translate(m.original, targetLang);
      setTrans((p) => ({ ...p, [m.messageId]: { loading: false, text: result, shown: true, done: true } }));
    },
    [trans, targetLang],
  );

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

            {(() => {
              const t = trans[m.messageId];
              return (
                <>
                  {t?.shown && !t.loading && (
                    <View style={[styles.translationBox, { backgroundColor: colors.backgroundSelected }]}>
                      <ThemedText
                        type="small"
                        style={{ color: t.text ? colors.accent : colors.textSecondary }}
                      >
                        {t.text ?? '번역할 내용이 없어요.'}
                      </ThemedText>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.translateBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t?.done && t.shown ? '번역 숨기기' : '번역'}
                    disabled={t?.loading}
                    onPress={() => onTranslate(m)}
                  >
                    {t?.loading ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <>
                        <Feather name="globe" size={13} color={colors.accent} />
                        <ThemedText type="small" style={[styles.translateText, { color: colors.accent }]}>
                          {t?.done && t.shown ? '숨기기' : '번역'}
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              );
            })()}
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
  translationBox: {
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
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

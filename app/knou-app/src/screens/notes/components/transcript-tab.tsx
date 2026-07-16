import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveSourceLang, translateDetailed } from '@/lib/translate';
import { useSettingsStore } from '@/store';
import { fromBackendLang, type MeetingMessageDto } from '@/types/meeting';
import { translateText } from '../api';
import { SPEAKER_COLORS } from './summary-tab';

/** 메시지별 번역 상태. text=마지막 번역 결과(실패 시 null). 버튼을 누를 때마다 새로 번역한다. */
interface TransState {
  loading: boolean;
  text: string | null;
  /** 번역이 오래 걸려(서버 대기 등) '번역 중' 안내를 표시할지. */
  slow: boolean;
  /**
   * 원문이 이미 내 설정 언어라 번역할 필요가 없는 상태.
   * (text=null 이지만 '실패'가 아님 — 실패 문구 대신 원문을 그대로 노출한다.)
   */
  sameLang: boolean;
}

/**
 * 이 시간(ms)을 넘겨도 번역이 안 끝나면(서버 번역 대기 등) '번역 중' 안내를 띄운다.
 * 모델 보유 시 온디바이스는 1초 안쪽, 미보유 시엔 즉시 서버로 폴백하므로
 * 이 지연을 넘기는 건 서버 응답이 느린 경우뿐이다.
 */
const SLOW_HINT_DELAY_MS = 2000;

/**
 * 전사 탭 온디바이스 번역 시도 타임아웃(짧게). 모델 미보유 시엔 translateDetailed 가
 * 다운로드를 기다리지 않고 즉시 실패를 돌려주므로(waitForModel=false), 이 값은 모델
 * 보유 상태에서 네이티브 호출이 멈추는 경우를 끊는 안전장치다.
 */
const ON_DEVICE_TIMEOUT_MS = 2500;

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
 * 메시지마다 '번역' 버튼 → 설정에서 고른 언어(myLanguage)로 온디바이스 ML Kit 번역(@/lib/translate).
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
      if (trans[m.messageId]?.loading) return; // 진행 중이면 무시

      // 원문 언어 결정: 내용(스크립트) 기반 감지 우선 — 저장된 lang 은 발화자의 설정 언어라
      // 실제 내용과 다를 수 있다(설정 ko 로 영어를 입력하면 lang=ko). 태그를 신뢰해 엉뚱한
      // 언어쌍으로 번역하면 결과가 깨지므로, 태그는 ja/zh 구분(한자만 쓴 문장)에만 쓴다.
      const sourceLang = resolveSourceLang(m.original, m.lang ? fromBackendLang(m.lang) : undefined);

      // 재감지 후에도 원문이 이미 내 언어면 번역할 게 없다 → 원문 그대로 노출(실패 아님).
      if (sourceLang === targetLang) {
        setTrans((p) => ({
          ...p,
          [m.messageId]: { loading: false, text: null, slow: false, sameLang: true },
        }));
        return;
      }

      // 누를 때마다 설정 언어(myLanguage)로 새로 번역 — 이전에 실패했어도 그대로 재시도.
      setTrans((p) => ({
        ...p,
        [m.messageId]: { loading: true, text: null, slow: false, sameLang: false },
      }));
      // 번역이 오래 걸리면(서버 대기 등) '번역 중' 안내를 켠다. 빠르면 타이머 취소.
      const slowTimer = setTimeout(() => {
        setTrans((p) => {
          const cur = p[m.messageId];
          if (!cur?.loading) return p; // 이미 끝났으면 무시
          return { ...p, [m.messageId]: { ...cur, slow: true } };
        });
      }, SLOW_HINT_DELAY_MS);

      // 1) 온디바이스 먼저 — 모델 보유 시 즉시·무과금·오프라인. 미보유 시 다운로드를 기다리지
      //    않고 즉시 실패를 돌려준다(waitForModel=false; 다운로드는 백그라운드로 진행되어
      //    다음 번역부턴 온디바이스로 처리).
      let result = (
        await translateDetailed(m.original, targetLang, sourceLang, ON_DEVICE_TIMEOUT_MS, false)
      ).text;
      // 2) 모델 미보유 시 서버 번역(Gemini)으로 즉시 폴백 — ja·zh 포함 안정적.
      if (result == null) {
        try {
          result = await translateText(m.original, targetLang);
        } catch (e) {
          console.warn('[translate] 서버 번역 폴백 실패:', e);
        }
      }
      clearTimeout(slowTimer);
      setTrans((p) => ({
        ...p,
        [m.messageId]: { loading: false, text: result, slow: false, sameLang: false },
      }));
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
                  {t && !t.loading && (
                    <View style={[styles.translationBox, { backgroundColor: colors.backgroundSelected }]}>
                      <ThemedText
                        type="small"
                        style={{ color: t.text ? colors.accent : colors.textSecondary }}
                      >
                        {t.sameLang
                          ? m.original
                          : (t.text ?? '번역에 실패했어요. 다시 눌러 주세요.')}
                      </ThemedText>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.translateBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="번역"
                    disabled={t?.loading}
                    onPress={() => onTranslate(m)}
                  >
                    {t?.loading ? (
                      <>
                        <ActivityIndicator size="small" color={colors.accent} />
                        {t.slow && (
                          <ThemedText type="small" themeColor="textSecondary" style={styles.slowText}>
                            번역 중…
                          </ThemedText>
                        )}
                      </>
                    ) : (
                      <>
                        <Feather name="globe" size={13} color={colors.accent} />
                        <ThemedText type="small" style={[styles.translateText, { color: colors.accent }]}>
                          번역
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
  slowText: {
    fontSize: 12,
  },
});

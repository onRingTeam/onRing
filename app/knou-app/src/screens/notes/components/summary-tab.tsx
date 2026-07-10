import { ActivityIndicator, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MeetingDetail } from '@/types/meeting';
import { styles } from '../notes-detail-screen.styles';

/** 화자 구분용 색상 팔레트 (발화 통계 바). */
export const SPEAKER_COLORS = ['#1A3461', '#2D67C8', '#4A90D9', '#7DB0E8', '#A9CCEF'];

export interface SummaryTabProps {
  detail: MeetingDetail;
  /** 요약이 아직 없고 폴링 중(방금 종료) → '생성 중' 표시. */
  summaryPending: boolean;
}

/** 상세회의 'AI 요약' 탭 — 요약 내용 · 액션 아이템 · 화자별 발화. (화면정의서 4-c) */
export function SummaryTab({ detail, summaryPending }: SummaryTabProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const actionItems = detail.speakers.filter((s) => !!s.actionItem);

  return (
    <>
      {/* 요약 내용 */}
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <ThemedText type="smallBold">요약 내용</ThemedText>
        {detail.summary ? (
          <ThemedText type="small" themeColor="text" style={styles.summaryText}>
            {detail.summary}
          </ThemedText>
        ) : summaryPending ? (
          <View style={styles.summaryPending}>
            <ActivityIndicator size="small" color={colors.accent} />
            <ThemedText type="small" themeColor="textSecondary">
              AI 요약 생성 중...
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.summaryText}>
            AI 요약이 아직 없습니다.
          </ThemedText>
        )}
      </View>

      {/* 액션 아이템 */}
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <ThemedText type="smallBold">액션 아이템</ThemedText>
        {actionItems.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            액션 아이템이 아직 없습니다.
          </ThemedText>
        ) : (
          actionItems.map((s, i) => (
            <View key={s.userId} style={[styles.actionItem, { borderTopColor: colors.border }, i === 0 && styles.actionItemFirst]}>
              <View style={[styles.actionIndex, { backgroundColor: colors.primaryLight }]}>
                <ThemedText type="small" style={[styles.actionIndexText, { color: colors.primary }]}>
                  {i + 1}
                </ThemedText>
              </View>
              <View style={styles.actionBody}>
                <ThemedText type="small" style={[styles.actionWho, { color: colors.accent }]}>
                  {s.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.actionWhat}>
                  {s.actionItem}
                </ThemedText>
              </View>
            </View>
          ))
        )}
      </View>

      {/* 화자별 발화 */}
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <ThemedText type="smallBold">화자별 발화</ThemedText>
        {detail.speakers.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            발화 기록이 아직 없습니다.
          </ThemedText>
        ) : (
          detail.speakers.map((s, i) => {
            const color = SPEAKER_COLORS[i % SPEAKER_COLORS.length];
            return (
              <View key={s.userId} style={styles.speakerRow}>
                <View style={styles.speakerHead}>
                  <View style={styles.speakerNameWrap}>
                    <View style={[styles.speakerDot, { backgroundColor: color }]}>
                      <ThemedText type="small" style={styles.speakerInitial}>
                        {s.name.charAt(0)}
                      </ThemedText>
                    </View>
                    <ThemedText type="small">{s.name}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.speakerCount}>
                    {s.speechCount}회 ({Math.round(s.speechRatio)}%)
                  </ThemedText>
                </View>
                <View style={[styles.speakerTrack, { backgroundColor: colors.backgroundSelected }]}>
                  <View
                    style={[styles.speakerFill, { width: `${Math.min(100, s.speechRatio)}%`, backgroundColor: color }]}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
    </>
  );
}

// 1. Import
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDuration, formatMeetingDate } from '@/utils/meeting-format';
import { useMeetingDetail } from './hooks';
import { styles } from './notes-detail-screen.styles';

export interface NotesDetailScreenProps {
  id: string;
}

/** 화자 구분용 색상 팔레트 (발화 통계 바). */
const SPEAKER_COLORS = ['#1A3461', '#2D67C8', '#4A90D9', '#7DB0E8', '#A9CCEF'];

// 2. 페이지(함수) 시작
export function NotesDetailScreen({ id }: NotesDetailScreenProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  const meetingId = Number(id);
  const { data: detail, isLoading, isError } = useMeetingDetail(meetingId);

  // 3. 상단 통계 카드 데이터
  const stats = detail
    ? [
        { label: '참여자', value: `${detail.participantCount}명`, icon: 'users' as const },
        { label: '참여 언어', value: `${detail.languageCount}개`, icon: 'globe' as const },
        { label: '총 회의시간', value: formatDuration(detail.durationSec), icon: 'clock' as const },
      ]
    : [];
  const actionItems = detail?.speakers.filter((s) => !!s.actionItem) ?? [];

  // 4. Return
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* 뒤로가기 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <Feather name="chevron-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {detail?.title ?? '상세회의'}
            </ThemedText>
            {detail && (
              <ThemedText type="small" themeColor="textSecondary">
                {formatMeetingDate(detail.meetingDate)}
              </ThemedText>
            )}
          </View>
        </View>

        {isLoading ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
            로드 중...
          </ThemedText>
        ) : isError || !detail ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
            회의를 불러오지 못했습니다.
          </ThemedText>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* 상단 통계 카드 */}
            <View style={styles.statsRow}>
              {stats.map((s) => (
                <View
                  key={s.label}
                  style={[styles.statCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                >
                  <Feather name={s.icon} size={15} color={colors.accent} />
                  <ThemedText type="smallBold" style={styles.statValue}>
                    {s.value}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
                    {s.label}
                  </ThemedText>
                </View>
              ))}
            </View>

            {/* 요약 내용 */}
            <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <ThemedText type="smallBold">요약 내용</ThemedText>
              <ThemedText type="small" themeColor={detail.summary ? 'text' : 'textSecondary'} style={styles.summaryText}>
                {detail.summary ?? 'AI 요약이 아직 없습니다.'}
              </ThemedText>
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
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

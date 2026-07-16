// 1. Import
import { useEffect, useState } from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDuration, formatMeetingDate } from '@/utils/meeting-format';
import { useMeetingDetail, useMeetingTranscript } from './hooks';
import { SummaryTab } from './components/summary-tab';
import { TranscriptTab } from './components/transcript-tab';
import { styles } from './notes-detail-screen.styles';

export interface NotesDetailScreenProps {
  id: string;
  /** 방금 종료한 회의 → 요약 생성 완료까지 폴링하며 '생성 중' 표시. */
  waitForSummary?: boolean;
}

type DetailTab = 'summary' | 'transcript';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'summary', label: 'AI 요약' },
  { key: 'transcript', label: '전체 대화' },
];

// 2. 페이지(함수) 시작
export function NotesDetailScreen({ id, waitForSummary = false }: NotesDetailScreenProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  const meetingId = Number(id);
  const [tab, setTab] = useState<DetailTab>('summary');
  // 상세보기 진입 시 항상 'AI 요약' 탭부터. 다른 회의로 전환돼 라우트가 재사용돼도(이전 탭 잔존 방지)
  // id 가 바뀌면 요약 탭으로 리셋한다.
  useEffect(() => {
    setTab('summary');
  }, [id]);
  const {
    data: detail,
    isLoading,
    isError,
    isSummaryPending,
  } = useMeetingDetail(meetingId, { waitForSummary });
  // 전체 대화 탭 진입 시에만 조회 (lazy). 종료 회의 대화는 불변이라 한 번만 받아 캐시.
  const {
    data: transcript,
    isLoading: transcriptLoading,
    isError: transcriptError,
  } = useMeetingTranscript(meetingId, { enabled: !!detail && tab === 'transcript' });
  // 요약이 아직 없고 폴링 중(방금 종료했거나, 예전 회의를 다시 열어 백엔드가 온디맨드 재생성 중)
  // → '생성 중' 표시. 폴링 상한 도달 시 자연히 해제된다.
  const summaryPending = isSummaryPending;

  // 3. 상단 통계 카드 데이터
  const stats = detail
    ? [
        { label: '참여자', value: `${detail.participantCount}명`, icon: 'users' as const },
        { label: '참여 언어', value: `${detail.languageCount}개`, icon: 'globe' as const },
        { label: '총 회의시간', value: formatDuration(detail.durationSec), icon: 'clock' as const },
      ]
    : [];

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

            {/* 세그먼트 탭 (AI 요약 / 전체 대화) */}
            <View style={[styles.tabRow, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              {TABS.map((t) => {
                const selected = tab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.tabBtn, selected && { backgroundColor: colors.backgroundSelected }]}
                    activeOpacity={0.7}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setTab(t.key)}
                  >
                    <ThemedText
                      type={selected ? 'smallBold' : 'small'}
                      style={{ color: selected ? colors.accent : colors.textSecondary }}
                    >
                      {t.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {tab === 'summary' ? (
              <SummaryTab detail={detail} summaryPending={summaryPending} />
            ) : (
              <TranscriptTab
                messages={transcript ?? []}
                isLoading={transcriptLoading}
                isError={transcriptError}
              />
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

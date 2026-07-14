// 1. Import
import { useCallback, useState } from 'react';
import { ScrollView, View, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUiStore, useAuthStore, useMeetingStore } from '@/store';
import type { MeetingListItem } from '@/types/meeting';
import { LANG_BADGE, formatDuration, formatMeetingDate } from '@/utils/meeting-format';
import { useHydrateActiveMeeting, useJoinMeeting, useRecentMeetings } from './hooks';
import { CreateMeetingSheet } from './components/create-meeting-sheet';
import { styles } from './home-screen.styles';

// 2. 페이지(함수) 시작
export function HomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // 3. useState (페이지 내부 로컬 상태 )
  const [joinCode, setJoinCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [greeting] = useState('안녕하세요,');
  const [showActiveConfirm, setShowActiveConfirm] = useState(false);

  // 4. 전역 상태 & 비동기 서비스
  // - Zustand: 로그인 사용자, UI 모달 제어, 진행중 회의(단일 소스)
  const user = useAuthStore((s) => s.user);
  const setShowCreateSheet = useUiStore((s) => s.setShowCreateSheet);
  const activeMeeting = useMeetingStore((s) => s.activeMeeting);
  const hydrateActiveMeeting = useHydrateActiveMeeting();
  // - TanStack Query: 최근 회의 목록
  const { data: recentMeetings = [], isLoading } = useRecentMeetings();
  const joinMutation = useJoinMeeting();

  // 홈에 진입할 때마다 서버 기준 진행중 회의를 스토어에 동기화 (종료/생성 후 상태 정합).
  useFocusEffect(
    useCallback(() => {
      hydrateActiveMeeting();
    }, [hydrateActiveMeeting]),
  );

  // 5. 함수들
  const handleStartMeeting = () => {
    // 진행 중인 회의가 있으면 새 회의 생성 불가 → 회의실 이동 confirm (화면정의서 2-b-i-1)
    if (activeMeeting) {
      setShowActiveConfirm(true);
      return;
    }
    setShowCreateSheet(true);
  };

  const goToActiveMeeting = () => {
    setShowActiveConfirm(false);
    if (!activeMeeting) return;
    router.push({
      pathname: '/(tabs)/meeting',
      params: { meetingId: String(activeMeeting.meetingId), code: activeMeeting.meetingCode },
    });
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || joinMutation.isPending) return;
    setCodeError(null);
    try {
      // 코드로 참여 — 진행중/종료/미존재 검증은 백엔드가 수행 (화면정의서 2-c-i)
      const room = await joinMutation.mutateAsync(code);
      setJoinCode('');
      router.push({
        pathname: '/(tabs)/meeting',
        params: { meetingId: String(room.meetingId), code: room.meetingCode },
      });
    } catch (e) {
      // 코드 불일치(404)/종료(409) → 입력창 인라인 에러로 안내 (화면정의서 2-c-i-2, 2-c-i-3)
      const status = (e as { status?: number }).status;
      setCodeError(status === 409 ? '이미 종료된 회의입니다.' : '코드를 찾을 수 없습니다.');
    }
  };

  const handleSelectMeeting = (meeting: MeetingListItem) => {
    router.push({
      pathname: '/notes/[id]',
      params: { id: String(meeting.meetingId) },
    });
  };

  const handleSeeAllNotes = () => {
    router.push('/(tabs)/notes');
  };

  // 6. Return (UI + 함수/이벤트 조합)
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* 헤더 - 사용자 인사 */}
        <View
          style={styles.header}
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${greeting} ${user?.name ?? '사용자'} 님`}
        >
          <View
            style={[styles.avatar, { backgroundColor: colors.primary }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <ThemedText style={styles.avatarText}>OR</ThemedText>
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.greetingLabel}>
              {greeting}
            </ThemedText>
            <ThemedText type="smallBold">{user?.name ?? '사용자'} 님</ThemedText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero 카드 - 새 회의 시작 */}
          <TouchableOpacity
            style={[styles.heroCard, { backgroundColor: colors.primary }]}
            onPress={handleStartMeeting}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="새 회의 만들기"
            accessibilityHint={
              activeMeeting ? '진행 중인 회의실로 이동합니다' : '새 회의 생성 화면을 엽니다'
            }
          >
            <ThemedText style={styles.heroEyebrow}>지금 바로 시작</ThemedText>
            <ThemedText style={styles.heroTitle}>새 회의 만들기</ThemedText>
            <View style={styles.heroPill}>
              <Feather name="plus" size={14} color="#ffffff" />
              <ThemedText style={styles.heroPillText}>회의 시작</ThemedText>
            </View>
          </TouchableOpacity>

          {/* 코드로 참여 */}
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardLabel}>
              코드로 참여
            </ThemedText>
            <View style={styles.joinRow}>
              <TextInput
                style={[
                  styles.codeInput,
                  {
                    backgroundColor: colors.backgroundSelected,
                    color: codeError ? colors.error : colors.text,
                    borderColor: codeError ? colors.error : 'transparent',
                  },
                ]}
                placeholder="회의 코드 입력..."
                placeholderTextColor={colors.textSecondary}
                value={joinCode}
                onChangeText={(t) => {
                  setJoinCode(t);
                  if (codeError) setCodeError(null); // 다시 입력하면 에러 해제
                }}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="회의 코드 입력"
                accessibilityHint="참여할 회의의 코드를 입력하세요"
              />
              <TouchableOpacity
                style={[styles.joinBtn, { backgroundColor: colors.accent }]}
                onPress={handleJoinByCode}
                disabled={!joinCode.trim() || joinMutation.isPending}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="회의 참여"
                accessibilityHint="입력한 코드로 회의에 참여합니다"
                accessibilityState={{ disabled: !joinCode.trim() || joinMutation.isPending }}
              >
                <ThemedText style={styles.joinBtnText}>
                  {joinMutation.isPending ? '참여 중…' : '참여'}
                </ThemedText>
              </TouchableOpacity>
            </View>
            {codeError && (
              <ThemedText type="small" themeColor="error" style={styles.codeErrorText}>
                {codeError}
              </ThemedText>
            )}
          </View>

          {/* 최근 회의 */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.recentTitle}
                accessibilityRole="header"
              >
                최근 회의
              </ThemedText>
              {recentMeetings.length > 0 && (
                <TouchableOpacity
                  onPress={handleSeeAllNotes}
                  accessibilityRole="button"
                  accessibilityLabel="전체 보기"
                  accessibilityHint="전체 회의록 목록으로 이동합니다"
                >
                  <ThemedText style={[styles.seeAll, { color: colors.accent }]}>전체 보기</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {isLoading ? (
              <ThemedText type="small" themeColor="textSecondary" accessibilityLabel="회의 목록 로드 중">
                로드 중...
              </ThemedText>
            ) : recentMeetings.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText type="small" themeColor="textSecondary">
                  최근 회의가 없습니다
                </ThemedText>
              </View>
            ) : (
              <View style={styles.meetingsList}>
                {recentMeetings.map((meeting) => (
                  <TouchableOpacity
                    key={meeting.meetingId}
                    style={[styles.meetingItem, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                    onPress={() => handleSelectMeeting(meeting)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${meeting.title}, ${formatMeetingDate(meeting.meetingDate)}, ${formatDuration(meeting.durationSec)}${meeting.languages.length > 0 ? `, 사용 언어 ${meeting.languages.map((l) => LANG_BADGE[l]).join(' ')}` : ''}`}
                    accessibilityHint="회의록 상세 화면으로 이동합니다"
                  >
                    <View
                      style={[styles.meetingIcon, { backgroundColor: colors.backgroundSelected }]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      <Feather name="file-text" size={15} color={colors.primary} />
                    </View>
                    <View style={styles.meetingBody}>
                      <ThemedText type="small" numberOfLines={1} style={styles.meetingTitle}>
                        {meeting.title}
                      </ThemedText>
                      <View style={styles.meetingMeta}>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                          {formatMeetingDate(meeting.meetingDate)}
                        </ThemedText>
                        <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
                        <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                          {formatDuration(meeting.durationSec)}
                        </ThemedText>
                      </View>
                      {meeting.languages.length > 0 && (
                        <View style={styles.langRow}>
                          {meeting.languages.map((l) => (
                            <View key={l} style={[styles.langBadge, { backgroundColor: colors.backgroundSelected }]}>
                              <ThemedText type="small" style={[styles.langBadgeText, { color: colors.primary }]}>
                                {LANG_BADGE[l]}
                              </ThemedText>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* 새 회의 생성 바텀시트 (「회의 시작」 → showCreateSheet) */}
      <CreateMeetingSheet />

      {/* 진행 중인 회의 confirm (화면정의서 2-b-i-1) */}
      <Modal visible={showActiveConfirm} transparent animationType="fade" onRequestClose={() => setShowActiveConfirm(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmCard, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.confirmTitle}>
              진행 중인 회의가 있어요
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.confirmBody}>
              진행 중인 회의가 있으면 새 회의를 만들 수 없어요. 진행 중인 회의실로 이동할까요?
            </ThemedText>
            <View style={styles.confirmRow}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.backgroundSelected }]}
                onPress={() => setShowActiveConfirm(false)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="취소"
              >
                <ThemedText type="small" themeColor="textSecondary" style={styles.confirmBtnText}>
                  취소
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={goToActiveMeeting}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="회의실로 이동"
              >
                <ThemedText type="small" style={[styles.confirmBtnText, { color: '#ffffff' }]}>
                  이동하기
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

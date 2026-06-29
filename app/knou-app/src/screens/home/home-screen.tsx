// 1. Import
import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMeetingStore, useUiStore, useAuthStore } from '@/store';
import type { MeetingRecord } from '@/types/meeting';
import { useRecentMeetings } from './hooks';
import { styles } from './home-screen.styles';

// 2. 페이지(함수) 시작
export function HomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // 3. useState (페이지 내부 로컬 상태 )
  const [joinCode, setJoinCode] = useState('');
  const [greeting] = useState('안녕하세요,');

  // 4. 전역 상태 & 비동기 서비스
  // - Zustand: 로그인 사용자, 회의 중 상태, UI 모달 제어
  const user = useAuthStore((s) => s.user);
  const inMeeting = useMeetingStore((s) => s.inMeeting);
  const setShowCreateSheet = useUiStore((s) => s.setShowCreateSheet);
  // - TanStack Query: 최근 회의 목록 (서버 응답 매핑된 결과)
  const { data: recentMeetings = [], isLoading } = useRecentMeetings(3);

  // 5. 함수들
  const handleStartMeeting = () => {
    if (inMeeting) {
      router.push('/(tabs)/meeting');
      return;
    }
    setShowCreateSheet(true);
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    // TODO: API 호출 - 회의 코드로 참여
    setJoinCode('');
  };

  const handleSelectMeeting = (meeting: MeetingRecord) => {
    router.push({
      pathname: '/notes/[id]',
      params: { id: meeting.id },
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
              inMeeting ? '진행 중인 회의실로 이동합니다' : '새 회의 생성 화면을 엽니다'
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
                style={[styles.codeInput, { backgroundColor: colors.backgroundSelected, color: colors.text }]}
                placeholder="회의 코드 입력..."
                placeholderTextColor={colors.textSecondary}
                value={joinCode}
                onChangeText={setJoinCode}
                maxLength={6}
                autoCapitalize="characters"
                accessibilityLabel="회의 코드 입력"
                accessibilityHint="참여할 회의의 코드를 입력하세요"
              />
              <TouchableOpacity
                style={[styles.joinBtn, { backgroundColor: colors.accent }]}
                onPress={handleJoinByCode}
                disabled={!joinCode.trim()}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="회의 참여"
                accessibilityHint="입력한 코드로 회의에 참여합니다"
                accessibilityState={{ disabled: !joinCode.trim() }}
              >
                <ThemedText style={styles.joinBtnText}>참여</ThemedText>
              </TouchableOpacity>
            </View>
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
                {recentMeetings.map((meeting) => {
                  const durationMin = Math.floor(meeting.durationSeconds / 60);
                  const dateStr = new Date(meeting.startedAt).toLocaleDateString('ko-KR');
                  return (
                    <TouchableOpacity
                      key={meeting.id}
                      style={[styles.meetingItem, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
                      onPress={() => handleSelectMeeting(meeting)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${meeting.title}, ${dateStr}, ${durationMin}분`}
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
                            {dateStr}
                          </ThemedText>
                          <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
                          <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                            {durationMin}분
                          </ThemedText>
                        </View>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

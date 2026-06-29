// 1. Import
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MeetingCard } from '@/components/ui/meeting-card';
import { Colors, BottomTabInset, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMeetingStore, useUiStore, useSettingsStore } from '@/store';
import type { MeetingRecord } from '@/types/meeting';

// 2. 페이지(함수) 시작
export function HomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // 3. useState (페이지 내부 상태)
  const [recentMeetings, setRecentMeetings] = useState<MeetingRecord[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);

  // 4. 전역 상태 & 비동기 서비스
  // - Zustand: 회의 중 상태, UI 모달 제어, 사용자 설정
  const inMeeting = useMeetingStore((s) => s.inMeeting);
  const setShowCreateSheet = useUiStore((s) => s.setShowCreateSheet);
  const myLanguage = useSettingsStore((s) => s.myLanguage);

  // 5. 함수들
  const handleStartMeeting = () => {
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

  const loadRecentMeetings = async () => {
    setIsLoadingMeetings(true);
    try {
      // TODO: API 호출 - 최근 회의 목록 조회 (limit: 4)
      const mockMeetings: MeetingRecord[] = [
        {
          id: '1',
          title: '팀 회의',
          code: 'ABC123',
          startedAt: Date.now() - 86400000,
          durationSeconds: 1500,
          speakers: [],
          captions: [],
          language: myLanguage,
        },
      ];
      setRecentMeetings(mockMeetings);
    } catch (error) {
      console.error('최근 회의 로드 실패:', error);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  // 6. useEffect
  useEffect(() => {
    loadRecentMeetings();
  }, [myLanguage]);

  // 7. Return (UI + 함수/이벤트 조합)
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* 헤더 */}
          <View style={styles.header}>
            <ThemedText type="subtitle">OnRing</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {inMeeting ? '📞 회의 중' : '준비 완료'}
            </ThemedText>
          </View>

          {/* 빠른 시작 버튼 */}
          <TouchableOpacity
            style={[styles.quickStartBtn, { backgroundColor: colors.primary }]}
            onPress={handleStartMeeting}
            activeOpacity={0.7}
          >
            <Feather name="play-circle" size={20} color="#ffffff" />
            <ThemedText style={styles.quickStartText}>새 회의 시작</ThemedText>
          </TouchableOpacity>

          {/* 코드로 참여 */}
          <View style={styles.joinSection}>
            <ThemedText type="smallBold">코드로 참여</ThemedText>
            <View style={[styles.codeInputWrapper, { borderColor: colors.border }]}>
              <TextInput
                style={[styles.codeInput, { color: colors.text }]}
                placeholder="회의 코드 입력"
                placeholderTextColor={colors.textSecondary}
                value={joinCode}
                onChangeText={setJoinCode}
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                onPress={handleJoinByCode}
                disabled={!joinCode.trim()}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.joinBtnText}>참여</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* 최근 회의 */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <ThemedText type="smallBold">최근 회의</ThemedText>
              {recentMeetings.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/notes')}>
                  <ThemedText style={{ color: colors.primary, fontSize: 12 }}>
                    전체 보기 →
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {isLoadingMeetings ? (
              <ThemedText type="small" themeColor="textSecondary">
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
                    key={meeting.id}
                    onPress={() => handleSelectMeeting(meeting)}
                    activeOpacity={0.7}
                  >
                    <MeetingCard meeting={meeting} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  quickStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  quickStartText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  joinSection: {
    gap: Spacing.two,
  },
  codeInputWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  codeInput: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  joinBtn: {
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  recentSection: {
    gap: Spacing.two,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meetingsList: {
    gap: Spacing.two,
  },
  emptyState: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});

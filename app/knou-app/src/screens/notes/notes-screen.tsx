// 1. Import
import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MeetingListItem } from '@/types/meeting';
import { LANG_BADGE, formatDuration, formatMeetingDate } from '@/utils/meeting-format';
import { useDeleteMeetings, useMeetings, useToggleFavorite } from './hooks';
import { styles } from './notes-screen.styles';

type FilterTab = 'all' | 'starred';

// 2. 페이지(함수) 시작
export function NotesScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  // 3. useState (검색어 / 필터 탭 / 삭제 모드)
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 4. 서버 상태 — 회의록 목록 + 즐겨찾기 토글 + 선택 삭제
  const { data: meetings = [], isLoading } = useMeetings({
    keyword: query,
    favoriteOnly: filter === 'starred',
  });
  const favoriteMutation = useToggleFavorite();
  const deleteMutation = useDeleteMeetings();

  // 5. 함수들
  const handleDetail = (meeting: MeetingListItem) => {
    router.push({ pathname: '/notes/[id]', params: { id: String(meeting.meetingId) } });
  };

  const handleToggleStar = (meeting: MeetingListItem) => {
    if (favoriteMutation.isPending) return;
    favoriteMutation.mutate(meeting.meetingId);
  };

  // 삭제 모드 진입/해제 (해제 시 선택 초기화)
  const handleToggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  // 삭제 대상 체크박스 토글
  const handleToggleSelect = (meetingId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(meetingId)) next.delete(meetingId);
      else next.add(meetingId);
      return next;
    });
  };

  // 선택한 회의록 삭제 — 내 참석 레코드 use_yn=N 처리 후 목록 갱신
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0 || deleteMutation.isPending) return;
    deleteMutation.mutate([...selectedIds], {
      onSuccess: () => {
        setDeleteMode(false);
        setSelectedIds(new Set());
      },
    });
  };

  // 6. Return
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* 헤더 */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            회의록
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {meetings.length}개의 회의 기록
          </ThemedText>
        </View>

        {/* 검색 + 필터 */}
        <View style={styles.controls}>
          <View style={[styles.searchBox, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Feather name="search" size={14} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="회의 검색..."
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              accessibilityLabel="회의 검색"
            />
          </View>
          <View style={styles.filterRow}>
            {(['all', 'starred'] as const).map((f) => {
              const active = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.7}
                  style={[
                    styles.filterChip,
                    active
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.backgroundElement, borderColor: colors.border, borderWidth: 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <ThemedText type="small" style={{ color: active ? '#ffffff' : colors.textSecondary }}>
                    {f === 'all' ? '전체' : '⭐ 즐겨찾기'}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
            <View style={styles.deleteControls}>
              {deleteMode && (
                <TouchableOpacity
                  onPress={handleToggleDeleteMode}
                  activeOpacity={0.7}
                  style={styles.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel="삭제 취소"
                >
                  <ThemedText type="small" themeColor="textSecondary">
                    취소
                  </ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={deleteMode ? handleDeleteSelected : handleToggleDeleteMode}
                activeOpacity={0.7}
                style={styles.deleteBtn}
                disabled={deleteMode && (selectedIds.size === 0 || deleteMutation.isPending)}
                accessibilityRole="button"
                accessibilityLabel={deleteMode ? '선택한 회의록 삭제' : '삭제 모드'}
                accessibilityState={{ disabled: deleteMode && selectedIds.size === 0 }}
              >
                <ThemedText type="small" style={[styles.deleteText, { color: colors.error }]}>
                  {deleteMode
                    ? deleteMutation.isPending
                      ? '삭제 중…'
                      : `삭제${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`
                    : '삭제'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 목록 */}
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
              로드 중...
            </ThemedText>
          ) : meetings.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
              {query || filter === 'starred' ? '검색 결과가 없습니다.' : '회의 기록이 없습니다.'}
            </ThemedText>
          ) : (
            meetings.map((m) => (
              <View
                key={m.meetingId}
                style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
              >
                <View style={styles.cardTop}>
                  {deleteMode && (
                    <TouchableOpacity
                      onPress={() => handleToggleSelect(m.meetingId)}
                      activeOpacity={0.7}
                      style={styles.checkboxBtn}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${m.title} 삭제 선택`}
                      accessibilityState={{ checked: selectedIds.has(m.meetingId) }}
                    >
                      <Ionicons
                        name={selectedIds.has(m.meetingId) ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={selectedIds.has(m.meetingId) ? colors.error : colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                  <View style={[styles.cardIcon, { backgroundColor: colors.backgroundSelected }]}>
                    <Feather name="file-text" size={16} color={colors.primary} />
                  </View>
                  <TouchableOpacity
                    style={styles.cardBody}
                    onPress={() => (deleteMode ? handleToggleSelect(m.meetingId) : handleDetail(m))}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={deleteMode ? `${m.title} 삭제 선택` : `${m.title} 상세보기`}
                  >
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {m.title}
                    </ThemedText>
                    <View style={styles.metaRow}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                        {formatMeetingDate(m.meetingDate)}
                      </ThemedText>
                      <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
                      <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                        {formatDuration(m.durationSec)}
                      </ThemedText>
                      <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
                      <Feather name="users" size={10} color={colors.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                        {m.participantNames.length}명
                      </ThemedText>
                    </View>
                    {m.languages.length > 0 && (
                      <View style={styles.langRow}>
                        {m.languages.map((l) => (
                          <View key={l} style={[styles.langBadge, { backgroundColor: colors.backgroundSelected }]}>
                            <ThemedText type="small" style={[styles.langBadgeText, { color: colors.primary }]}>
                              {LANG_BADGE[l]}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                    {!!m.summary && (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.summary}>
                        {m.summary}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleToggleStar(m)}
                    activeOpacity={0.7}
                    style={styles.starBtn}
                    accessibilityRole="button"
                    accessibilityLabel={m.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                    accessibilityState={{ selected: m.favorite }}
                  >
                    <Ionicons
                      name={m.favorite ? 'star' : 'star-outline'}
                      size={16}
                      color={m.favorite ? '#F5B301' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleDetail(m)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="상세보기"
                  >
                    <Feather name="file-text" size={12} color="#ffffff" />
                    <ThemedText type="small" style={styles.actionText}>
                      상세보기
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

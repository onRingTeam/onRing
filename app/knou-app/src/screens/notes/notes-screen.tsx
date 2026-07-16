// 1. Import
import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { showAppAlert } from '@/components/ui/app-alert';
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

  // 3. useState (검색어 / 필터 탭 / 삭제 모드 / 삭제 확인 모달)
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

  // 선택한 회의록 삭제 — 확인 다이얼로그 후 내 참석 레코드 use_yn=N 처리
  const handleDeletePress = () => {
    if (selectedIds.size === 0 || deleteMutation.isPending) return;
    const count = selectedIds.size;
    void showAppAlert({
      title: `회의록 ${count}개를 삭제할까요?`,
      message:
        '내 목록에서만 숨겨지며 다른 참석자에게는 그대로 남아요. 삭제한 회의록은 최근 회의에서도 보이지 않습니다.',
      icon: 'trash-outline',
      iconTone: 'error',
      cancelable: true,
      buttons: [
        { key: 'cancel', text: '취소', style: 'cancel' },
        { key: 'delete', text: '삭제', style: 'destructive' },
      ],
    }).then((key) => {
      if (key !== 'delete') return;
      deleteMutation.mutate([...selectedIds], {
        onSuccess: () => {
          setDeleteMode(false);
          setSelectedIds(new Set());
        },
      });
    });
  };

  const selectedCount = selectedIds.size;

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
            {/* 삭제 모드 토글 — 아이콘 칩 (활성 시 강조) */}
            <TouchableOpacity
              onPress={handleToggleDeleteMode}
              activeOpacity={0.7}
              style={[
                styles.deleteToggle,
                deleteMode
                  ? { backgroundColor: colors.error, borderColor: colors.error }
                  : { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={deleteMode ? '삭제 모드 종료' : '회의록 삭제'}
              accessibilityState={{ selected: deleteMode }}
            >
              <Ionicons
                name={deleteMode ? 'close' : 'trash-outline'}
                size={15}
                color={deleteMode ? '#ffffff' : colors.textSecondary}
              />
              <ThemedText
                type="small"
                style={{ color: deleteMode ? '#ffffff' : colors.textSecondary, fontWeight: '600' }}
              >
                {deleteMode ? '완료' : '삭제'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* 목록 */}
        <ScrollView
          contentContainerStyle={[styles.list, deleteMode && styles.listDeleteMode]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
              로드 중...
            </ThemedText>
          ) : meetings.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
              {query || filter === 'starred' ? '검색 결과가 없습니다.' : '회의 기록이 없습니다.'}
            </ThemedText>
          ) : (
            meetings.map((m) => {
              const selected = selectedIds.has(m.meetingId);
              return (
                <View
                  key={m.meetingId}
                  style={[
                    styles.card,
                    { backgroundColor: colors.backgroundElement, borderColor: colors.border },
                    deleteMode && selected && { borderColor: colors.error, backgroundColor: colors.backgroundSelected },
                  ]}
                >
                  <View style={styles.cardTop}>
                    {deleteMode && (
                      <TouchableOpacity
                        onPress={() => handleToggleSelect(m.meetingId)}
                        activeOpacity={0.7}
                        style={styles.checkboxBtn}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`${m.title} 삭제 선택`}
                        accessibilityState={{ checked: selected }}
                      >
                        <Ionicons
                          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={selected ? colors.error : colors.textSecondary}
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
                    {!deleteMode && (
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
                    )}
                  </View>

                  {!deleteMode && (
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
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      {/* 삭제 모드 하단 액션 바 (선택 개수 + 삭제 버튼) */}
      {deleteMode && (
        <SafeAreaView edges={['bottom']} style={styles.deleteBarWrap} pointerEvents="box-none">
          <View style={[styles.deleteBar, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.deleteBarCount}>
              {selectedCount > 0 ? `${selectedCount}개 선택됨` : '삭제할 회의록을 선택하세요'}
            </ThemedText>
            <TouchableOpacity
              onPress={handleDeletePress}
              activeOpacity={0.85}
              disabled={selectedCount === 0}
              style={[
                styles.deleteBarBtn,
                { backgroundColor: selectedCount === 0 ? colors.backgroundSelected : colors.error },
              ]}
              accessibilityRole="button"
              accessibilityLabel="선택한 회의록 삭제"
              accessibilityState={{ disabled: selectedCount === 0 }}
            >
              <Ionicons
                name="trash-outline"
                size={15}
                color={selectedCount === 0 ? colors.textSecondary : '#ffffff'}
              />
              <ThemedText
                type="small"
                style={[styles.deleteBarBtnText, { color: selectedCount === 0 ? colors.textSecondary : '#ffffff' }]}
              >
                삭제{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

    </View>
  );
}

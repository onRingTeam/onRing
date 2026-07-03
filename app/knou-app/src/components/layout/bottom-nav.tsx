import { Platform, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUiStore } from '@/store';
import { useActiveMeeting } from '@/screens/home/hooks';

type NavTab = 'index' | 'notes' | 'settings';

const ICON: Record<NavTab | 'meeting', keyof typeof Feather.glyphMap> = {
  index: 'home',
  notes: 'file-text',
  meeting: 'mic',
  settings: 'settings',
};

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  // 진행중 회의 판단은 서버 active 조회로 통일 (홈과 동일 소스).
  // 회의 생성 시 active-meeting 캐시가 무효화돼 즉시 빨강 활성된다.
  const { data: activeMeeting } = useActiveMeeting();
  const setShowCreateSheet = useUiStore((s) => s.setShowCreateSheet);

  const isActive = (tab: NavTab) => {
    if (tab === 'index') return pathname === '/' || pathname === '/(tabs)';
    if (tab === 'notes') return pathname === '/notes' || pathname === '/(tabs)/notes';
    if (tab === 'settings') return pathname === '/settings' || pathname === '/(tabs)/settings';
    return false;
  };
  const isMeetingActive = pathname === '/meeting' || pathname === '/(tabs)/meeting';

  const handleNav = (tab: NavTab) => {
    if (tab === 'index') router.push('/(tabs)' as any);
    else if (tab === 'notes') router.push('/(tabs)/notes' as any);
    else if (tab === 'settings') router.push('/(tabs)/settings' as any);
  };

  const handleMeeting = () => {
    if (!activeMeeting) {
      // 진행중 회의 없음 → 홈으로 이동 후 회의 생성 바텀시트
      router.push('/(tabs)' as any);
      setShowCreateSheet(true);
    } else if (isMeetingActive) {
      // 이미 회의 화면이면 홈으로 토글
      router.push('/(tabs)' as any);
    } else {
      // 진행중 회의로 이동
      router.push({
        pathname: '/(tabs)/meeting',
        params: { meetingId: String(activeMeeting.meetingId), code: activeMeeting.meetingCode },
      } as any);
    }
  };

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.bar, { borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing.three }]}
    >
      {/* 1. 홈 */}
      <TouchableOpacity style={styles.tab} onPress={() => handleNav('index')} activeOpacity={0.7}>
        <View style={[styles.iconBox, isActive('index') && { backgroundColor: colors.primary }]}>
          <Feather name={ICON.index} size={24} color={isActive('index') ? '#ffffff' : colors.textSecondary} />
        </View>
        <ThemedText style={[styles.label, { color: isActive('index') ? colors.primary : colors.textSecondary }]}>
          홈
        </ThemedText>
      </TouchableOpacity>

      {/* 2. 회의록 */}
      <TouchableOpacity style={styles.tab} onPress={() => handleNav('notes')} activeOpacity={0.7}>
        <View style={[styles.iconBox, isActive('notes') && { backgroundColor: colors.primary }]}>
          <Feather name={ICON.notes} size={24} color={isActive('notes') ? '#ffffff' : colors.textSecondary} />
        </View>
        <ThemedText style={[styles.label, { color: isActive('notes') ? colors.primary : colors.textSecondary }]}>
          회의록
        </ThemedText>
      </TouchableOpacity>

      {/* 3. 회의 (마이크 — 항상 강조색, 회의 중엔 빨강) */}
      <TouchableOpacity style={styles.tab} onPress={handleMeeting} activeOpacity={0.7}>
        <View style={[styles.iconBox, { backgroundColor: activeMeeting ? colors.error : colors.primary }]}>
          <Feather name={ICON.meeting} size={24} color="#ffffff" />
        </View>
        <ThemedText style={[styles.label, { color: isMeetingActive ? colors.primary : colors.textSecondary }]}>
          회의
        </ThemedText>
      </TouchableOpacity>

      {/* 4. 설정 */}
      <TouchableOpacity style={styles.tab} onPress={() => handleNav('settings')} activeOpacity={0.7}>
        <View style={[styles.iconBox, isActive('settings') && { backgroundColor: colors.primary }]}>
          <Feather name={ICON.settings} size={24} color={isActive('settings') ? '#ffffff' : colors.textSecondary} />
        </View>
        <ThemedText style={[styles.label, { color: isActive('settings') ? colors.primary : colors.textSecondary }]}>
          설정
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    // 웹 클릭 시 생기는 사각 포커스 윤곽선 제거
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
});

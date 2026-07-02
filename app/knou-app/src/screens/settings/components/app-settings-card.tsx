import { StyleSheet, View } from 'react-native';

import { Toggle } from '@/components/ui/toggle';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store';

/** 앱 설정 (화면정의서 6-d). 알림/다크모드 — 로컬 전용(백엔드 미반영). */
export function AppSettingsCard() {
  const colors = useTheme();
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotifications = useSettingsStore((s) => s.setNotifications);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);

  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
        앱 설정
      </ThemedText>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.text}>
            <ThemedText type="small" style={styles.label}>
              알림
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sub}>
              채팅방 생성 시 알림
            </ThemedText>
          </View>
          <Toggle value={notifications} onValueChange={setNotifications} />
        </View>
        <View style={styles.rowLast}>
          <View style={styles.text}>
            <ThemedText type="small" style={styles.label}>
              다크모드
            </ThemedText>
          </View>
          <Toggle value={darkMode} onValueChange={setDarkMode} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.one,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderBottomWidth: 1,
  },
  rowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  text: { gap: 2 },
  label: { fontWeight: '600' },
  sub: { fontSize: 12 },
});

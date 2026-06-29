import { StyleSheet } from 'react-native';

import { SettingRow } from '@/components/ui/setting-row';
import { Toggle } from '@/components/ui/toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store';

export function AppSettingsCard() {
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotifications = useSettingsStore((s) => s.setNotifications);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">앱 설정</ThemedText>
      <SettingRow
        label="알림"
        sub="새 회의 토스트 알림"
        right={<Toggle value={notifications} onValueChange={setNotifications} />}
      />
      <SettingRow label="다크 모드" right={<Toggle value={darkMode} onValueChange={setDarkMode} />} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
});

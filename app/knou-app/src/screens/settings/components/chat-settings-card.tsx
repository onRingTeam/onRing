import { StyleSheet } from 'react-native';

import { SettingRow } from '@/components/ui/setting-row';
import { Toggle } from '@/components/ui/toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { LANG_EXAMPLE_TEXT } from '@/constants/languages';
import { useSettingsStore } from '@/store';

export function ChatSettingsCard() {
  const myLanguage = useSettingsStore((s) => s.myLanguage);
  const setMyLanguage = useSettingsStore((s) => s.setMyLanguage);
  const vibrate = useSettingsStore((s) => s.vibrate);
  const setVibrate = useSettingsStore((s) => s.setVibrate);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">채팅 설정</ThemedText>
      <SettingRow
        label="언어"
        sub="자막 언어"
        right={<ThemedText type="small">{myLanguage}</ThemedText>}
      />
      <ThemedText type="small" themeColor="textSecondary">
        미리보기: {LANG_EXAMPLE_TEXT[myLanguage]}
      </ThemedText>
      <SettingRow label="진동" right={<Toggle value={vibrate} onValueChange={setVibrate} />} />
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

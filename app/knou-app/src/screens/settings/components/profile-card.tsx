import { StyleSheet, TouchableOpacity } from 'react-native';

import { SettingRow } from '@/components/ui/setting-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useUiStore } from '@/store';

export function ProfileCard() {
  const setShowProfileEditSheet = useUiStore((s) => s.setShowProfileEditSheet);

  return (
    <TouchableOpacity onPress={() => setShowProfileEditSheet(true)} activeOpacity={0.7}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">프로필</ThemedText>
        <SettingRow label="이름" sub="사용자 이름" />
        <SettingRow label="이메일" sub="user@example.com" />
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
});

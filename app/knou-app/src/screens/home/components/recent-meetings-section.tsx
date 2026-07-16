import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function RecentMeetingsSection() {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">최근 회의</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        (실제 목록은 다음 단계)
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
});

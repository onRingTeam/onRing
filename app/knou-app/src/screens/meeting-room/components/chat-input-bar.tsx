import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

export function ChatInputBar() {
  return (
    <ThemedView type="backgroundElement" style={styles.bar}>
      <ThemedText type="small" themeColor="textSecondary">
        (실제 채팅 입력은 다음 단계)
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
});

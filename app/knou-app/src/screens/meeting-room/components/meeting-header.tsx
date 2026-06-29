import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export interface MeetingHeaderProps {
  title: string;
  elapsed: string;
  onEnd?: () => void;
}

export function MeetingHeader({ title, elapsed, onEnd }: MeetingHeaderProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.header}>
      <View style={styles.info}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {elapsed}
        </ThemedText>
      </View>
      {onEnd && (
        <TouchableOpacity onPress={onEnd} style={styles.endButton} activeOpacity={0.7}>
          <ThemedText type="small">종료</ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: Spacing.one,
  },
  endButton: {
    padding: Spacing.two,
    borderRadius: Spacing.one,
  },
});

import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CaptionItem } from '@/types/meeting';

export interface TranscriptListProps {
  captions: CaptionItem[];
  maxHeight?: number;
}

export function TranscriptList({ captions, maxHeight = 300 }: TranscriptListProps) {
  return (
    <ScrollView style={[styles.container, { maxHeight }]} nestedScrollEnabled>
      <View style={styles.list}>
        {captions.map((caption, idx) => (
          <View key={caption.id} style={styles.item}>
            <ThemedText type="smallBold">{caption.speaker.name}</ThemedText>
            <ThemedText type="small">{caption.text}</ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
  },
  item: {
    gap: Spacing.one,
  },
});

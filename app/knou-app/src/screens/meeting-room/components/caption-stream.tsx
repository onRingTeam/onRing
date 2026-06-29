import { ScrollView, StyleSheet } from 'react-native';

import { TranscriptList } from '@/components/ui/transcript-list';
import type { CaptionItem } from '@/types/meeting';

export interface CaptionStreamProps {
  captions: CaptionItem[];
}

export function CaptionStream({ captions }: CaptionStreamProps) {
  return (
    <ScrollView style={styles.container} nestedScrollEnabled>
      <TranscriptList captions={captions} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

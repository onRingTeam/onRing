import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { MeetingRecord } from '@/types/meeting';

export interface MeetingCardProps {
  meeting: MeetingRecord;
  onPress?: () => void;
}

export function MeetingCard({ meeting, onPress }: MeetingCardProps) {
  const durationMin = Math.floor(meeting.durationSeconds / 60);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{meeting.title || 'Untitled'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {meeting.code}
        </ThemedText>
        <View style={styles.meta}>
          <ThemedText type="small" themeColor="textSecondary">
            {durationMin}분 · {meeting.speakers.length}명
          </ThemedText>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  meta: {
    marginTop: Spacing.one,
  },
});

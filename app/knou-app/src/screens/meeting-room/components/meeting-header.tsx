import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Speaker } from '@/types/meeting';
import { SPEAKER_STYLES } from '../mock-data';

export interface MeetingHeaderProps {
  title: string;
  elapsed: string;
  speakers: Speaker[];
  onEnd?: () => void;
}

export function MeetingHeader({ title, elapsed, speakers, onEnd }: MeetingHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <ThemedText style={styles.status}>진행 중</ThemedText>
          <ThemedText style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
        </View>

        <View style={styles.timerPill}>
          <View style={styles.recDot} />
          <ThemedText style={styles.timerText}>{elapsed}</ThemedText>
        </View>

        {onEnd && (
          <TouchableOpacity
            onPress={onEnd}
            style={styles.endButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="회의 종료"
          >
            <ThemedText style={styles.endText}>종료</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.speakerRow}>
        {speakers.map((s) => {
          const meta = SPEAKER_STYLES[s.id] ?? { initial: s.name.charAt(0), color: '#2D67C8' };
          return (
            <View key={s.id} style={styles.chip}>
              <View style={[styles.chipAvatar, { backgroundColor: meta.color }]}>
                <ThemedText style={styles.chipAvatarText}>{meta.initial}</ThemedText>
              </View>
              <ThemedText style={styles.chipName} numberOfLines={1}>
                {s.name}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const NAVY = '#16305C';
const CHIP_BG = 'rgba(255,255,255,0.12)';

const styles = StyleSheet.create({
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomLeftRadius: Spacing.four,
    borderBottomRightRadius: Spacing.four,
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  status: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: CHIP_BG,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E05656',
  },
  timerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  endButton: {
    backgroundColor: '#D93B3B',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  endText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  speakerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: CHIP_BG,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: 999,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  chipName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    maxWidth: 90,
  },
});

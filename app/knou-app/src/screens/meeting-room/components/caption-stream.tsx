import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CaptionItem } from '@/types/meeting';
import { SPEAKER_STYLES } from '../mock-data';

export interface CaptionStreamProps {
  captions: CaptionItem[];
  /** 누군가 말하는 중 표시 */
  typing?: boolean;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function CaptionStream({ captions, typing = true }: CaptionStreamProps) {
  const colors = useTheme();

  return (
    <View style={styles.list}>
      {captions.map((caption) => {
        const meta = SPEAKER_STYLES[caption.speaker.id] ?? {
          initial: caption.speaker.name.charAt(0),
          color: colors.accent,
        };
        return (
          <View key={caption.id} style={styles.item}>
            <View style={styles.rowTop}>
              <View style={[styles.avatar, { backgroundColor: meta.color }]}>
                <ThemedText style={styles.avatarText}>{meta.initial}</ThemedText>
              </View>
              <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
                {caption.speaker.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatTime(caption.timestamp)}
              </ThemedText>
            </View>

            <ThemedText style={styles.original}>{caption.text}</ThemedText>

            {caption.translation && (
              <View style={[styles.translationBox, { backgroundColor: colors.backgroundSelected }]}>
                <ThemedText type="small" style={{ color: colors.accent }}>
                  {caption.translation}
                </ThemedText>
              </View>
            )}
          </View>
        );
      })}

      {typing && <TypingIndicator color={colors.accent} bg={colors.backgroundSelected} />}
    </View>
  );
}

function TypingIndicator({ color, bg }: { color: string; bg: string }) {
  return (
    <View style={[styles.typing, { backgroundColor: bg }]}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} color={color} delay={i * 180} />
      ))}
    </View>
  );
}

function Dot({ color, delay }: { color: string; delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.four,
    paddingVertical: Spacing.two,
  },
  item: {
    gap: Spacing.two,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  name: {
    flex: 1,
  },
  original: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
  },
  translationBox: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    marginLeft: 36,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

import { Image, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SYMBOL = require('@/assets/images/brand/onring-symbol.png');

export interface ScreenPlaceholderProps {
  /** 화면 이름 (예: 홈, 회의록) */
  title: string;
  /** 한 줄 설명 */
  description?: string;
}

/**
 * 개발 전 임시 화면. OnRing 심볼 + 시그니처 네이비로 통일된
 * "개발 중" 전문 placeholder.
 */
export function ScreenPlaceholder({ title, description }: ScreenPlaceholderProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={styles.container}>
      {/* OnRing 브랜드 심볼 */}
      <Image source={SYMBOL} style={styles.symbol} resizeMode="contain" />

      {/* 화면명 */}
      <ThemedText style={styles.title}>{title}</ThemedText>

      {/* 개발 중 배지 */}
      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
        <Feather name="tool" size={16} color="#ffffff" />
        <ThemedText style={styles.badgeText}>개발 중인 화면입니다</ThemedText>
      </View>

      {/* 설명 */}
      {description && (
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.four,
  },
  symbol: {
    width: 240,
    height: 240,
  },
  title: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700',
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    textAlign: 'center',
    maxWidth: 320,
    fontSize: 16,
    lineHeight: 24,
  },
});

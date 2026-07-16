import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUiStore } from '@/store';
import type { UserProfileResponse } from '@/types/settings';

export function ProfileCard({ profile }: { profile: UserProfileResponse }) {
  const colors = useTheme();
  const setShowProfileEditSheet = useUiStore((s) => s.setShowProfileEditSheet);
  const initial = profile.name.charAt(0) || '?';

  return (
    <TouchableOpacity
      onPress={() => setShowProfileEditSheet(true)}
      activeOpacity={0.9}
      style={[styles.card, { backgroundColor: colors.primary }]}
      accessibilityRole="button"
      accessibilityLabel="프로필 수정"
    >
      <View style={styles.avatar}>
        <ThemedText style={styles.avatarText}>{initial}</ThemedText>
      </View>
      <View style={styles.body}>
        <ThemedText style={styles.name}>{profile.name}</ThemedText>
        <ThemedText style={styles.email}>{profile.email}</ThemedText>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>
              {profile.subscribed ? '구독 중' : '무료 플랜'}
            </ThemedText>
          </View>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeTextMuted}>
              생성 가능 {profile.remainingCount}회 남음
            </ThemedText>
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color="#ffffff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 20,
    padding: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  email: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  badgeTextMuted: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
});

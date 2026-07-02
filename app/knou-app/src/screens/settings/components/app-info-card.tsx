import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signOut } from '@/lib/auth';

/** 앱 버전 (임시 하드코딩 — 추후 expo-constants 연동 가능). */
const APP_VERSION = '1.0.0';

/** 앱 정보 (화면정의서 6-e). 버전 / 개인정보 처리방침 / 로그아웃. */
export function AppInfoCard() {
  const colors = useTheme();

  const handleLogout = async () => {
    try {
      await signOut();
      // signOut 이 스토어를 비우면 루트 게이트가 /login 으로 보낸다.
    } catch (e) {
      console.warn('[settings] 로그아웃 실패', e);
    }
  };

  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
        앱 정보
      </ThemedText>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <ThemedText type="small" style={styles.label}>
            앱 버전
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {APP_VERSION}
          </ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.row, { borderBottomColor: colors.border }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="개인정보 처리방침"
        >
          <ThemedText type="small" style={styles.label}>
            개인정보 처리방침
          </ThemedText>
          <Feather name="chevron-right" size={14} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rowLast}
          onPress={handleLogout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="로그아웃"
        >
          <ThemedText type="small" style={[styles.label, { color: colors.error }]}>
            로그아웃
          </ThemedText>
          <Feather name="log-out" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.one,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderBottomWidth: 1,
  },
  rowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  label: { fontWeight: '600' },
});

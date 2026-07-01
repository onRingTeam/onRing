import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store';
import { signOut } from '@/lib/auth';

export function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    try {
      await signOut();
      // signOut 이 스토어를 비우면 루트 게이트가 /login 으로 보낸다.
    } catch (e) {
      console.warn('[settings] 로그아웃 실패', e);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScreenPlaceholder
          title="설정"
          description="프로필, 자막 언어, 알림 등 앱 환경을 설정하는 화면입니다."
        />

        <View style={styles.footer}>
          {user ? (
            <ThemedText style={[styles.account, { color: colors.textSecondary }]}>
              {user.email}
            </ThemedText>
          ) : null}
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.border }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={18} color={colors.error} />
            <ThemedText style={[styles.logoutText, { color: colors.error }]}>로그아웃</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  footer: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  account: { fontSize: 13, textAlign: 'center' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontWeight: '600' },
});

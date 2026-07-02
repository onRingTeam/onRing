import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loginWithGoogle } from '@/lib/auth';

const SYMBOL = require('../../assets/images/brand/onring-symbol.png');

/**
 * 로그인 화면. 구글 로그인 하나로 진입한다.
 * 성공 시 auth-store 가 인증 상태로 바뀌고, 루트 게이트([_layout])가 (tabs)로 보낸다.
 */
export default function LoginScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await loginWithGoogle();
      // 성공 시 스토어 변경 → 게이트가 자동 라우팅. 취소면 그냥 이 화면 유지.
    } catch (e) {
      console.warn('[login] 구글 로그인 실패', e);
      Alert.alert('로그인 실패', '구글 로그인 중 문제가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Image source={SYMBOL} style={styles.symbol} resizeMode="contain" accessibilityLabel="OnRing 로고" />

        <ThemedText style={[styles.tagline, { color: colors.textSecondary }]}>
            언어의 장벽을 끄고, 소통의 링을 켜다.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
          onPress={handleGoogle}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <AntDesign name="google" size={20} color="#EA4335" />
              <ThemedText style={[styles.googleText, { color: colors.text }]}>Google로 계속하기</ThemedText>
            </>
          )}
        </TouchableOpacity>

        <ThemedText style={[styles.notice, { color: colors.textSecondary }]}>
          로그인하면 서비스 이용약관에 동의하는 것으로 간주됩니다.
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 48 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  symbol: { width: '90%', maxWidth: 320, aspectRatio: 1, marginBottom: 8 },
  brand: { fontSize: 40, fontWeight: '800' },
  tagline: { fontSize: 15 },
  actions: { gap: 16 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
  },
  googleText: { fontSize: 16, fontWeight: '600' },
  notice: { fontSize: 12, textAlign: 'center' },
});

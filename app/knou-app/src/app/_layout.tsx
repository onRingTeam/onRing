import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppStatusBar } from '@/components/layout/app-status-bar';
import { useAuthStore } from '@/store';
import { bootstrapAuth } from '@/lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

/**
 * 인증 게이트. 저장된 세션을 복구하고, 로그인 여부에 따라 라우팅한다.
 *  - 미로그인 → /login 으로
 *  - 로그인됨 + 로그인 화면에 있음 → /(tabs) 로
 * 복구 중(isBootstrapping)엔 스플래시(AnimatedSplashOverlay)가 덮고 있어 깜빡임 없음.
 */
function useAuthGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const segments = useSegments();
  const router = useRouter();

  // 앱 시작 시 1회 세션 복구.
  useEffect(() => {
    bootstrapAuth();
  }, []);

  useEffect(() => {
    if (isBootstrapping) return;
    const onLogin = segments[0] === 'login';
    if (!isAuthenticated && !onLogin) {
      router.replace('/login');
    } else if (isAuthenticated && onLogin) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isBootstrapping, segments, router]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useAuthGate();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppStatusBar />
        <Stack>
          {/* 탭바를 가진 메인 영역 (회의록 상세도 (tabs) 안에 포함) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

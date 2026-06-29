import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppStatusBar } from '@/components/layout/app-status-bar';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppStatusBar />
      <Stack>
        {/* 탭바를 가진 메인 영역 */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* 회의록 상세 — 탭바 없는 push 화면 */}
        <Stack.Screen name="notes/[id]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

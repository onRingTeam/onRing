import { Tabs } from 'expo-router';

import { BottomNav } from '@/components/layout/bottom-nav';

export default function TabsLayout() {
  return (
    <Tabs tabBar={() => <BottomNav />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="settings" />
      {/* 탭바 유지하되 탭에 노출되지 않는 라우트 (href:null) */}
      <Tabs.Screen name="meeting" options={{ href: null }} />
      <Tabs.Screen name="meeting-summary" options={{ href: null }} />
      <Tabs.Screen name="notes/[id]" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
    </Tabs>
  );
}

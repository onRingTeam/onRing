import { useSettingsStore } from '@/store';

/**
 * 앱 전역 색상 스킴. OS 설정이 아니라 사용자의 다크모드 설정(설정 화면 토글)을 따른다.
 * 다크모드 설정은 settings-store에 영속화되어 앱을 다시 켜도 유지된다. → [settings-store]
 */
export function useColorScheme(): 'light' | 'dark' {
  return useSettingsStore((s) => (s.darkMode ? 'dark' : 'light'));
}

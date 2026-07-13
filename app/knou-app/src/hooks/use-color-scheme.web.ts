import { useSettingsStore } from '@/store';

/**
 * 앱 전역 색상 스킴(웹). OS 설정이 아니라 사용자의 다크모드 설정을 따른다. → [use-color-scheme]
 */
export function useColorScheme(): 'light' | 'dark' {
  return useSettingsStore((s) => (s.darkMode ? 'dark' : 'light'));
}

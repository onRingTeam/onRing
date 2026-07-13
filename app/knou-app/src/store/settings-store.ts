import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CaptionSize, SettingsState } from '@/types/settings';
import type { LangCode } from '@/types/meeting';

interface SettingsStore extends SettingsState {
  setMyLanguage: (lang: LangCode) => void;
  setCaptionSize: (size: CaptionSize) => void;
  setVibrate: (vibrate: boolean) => void;
  setDarkMode: (darkMode: boolean) => void;
  setNotifications: (notifications: boolean) => void;
}

/**
 * 로컬 앱 설정 스토어. 다크모드 등 기기 로컬 설정은 AsyncStorage로 영속화한다.
 * (언어/자막 크기/진동은 백엔드 채팅 설정과도 동기화되지만, 마지막 선택을 즉시 복원하기 위해 함께 저장)
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      myLanguage: 'ko',
      captionSize: 'medium',
      vibrate: true,
      darkMode: false,
      notifications: true,
      setMyLanguage: (lang) => set({ myLanguage: lang }),
      setCaptionSize: (size) => set({ captionSize: size }),
      setVibrate: (vibrate) => set({ vibrate }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name: 'knou-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // 액션은 제외하고 값만 저장
      partialize: (s) => ({
        myLanguage: s.myLanguage,
        captionSize: s.captionSize,
        vibrate: s.vibrate,
        darkMode: s.darkMode,
        notifications: s.notifications,
      }),
    },
  ),
);

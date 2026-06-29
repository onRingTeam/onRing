import { create } from 'zustand';
import type { CaptionSize, SettingsState } from '@/types/settings';
import type { LangCode } from '@/types/meeting';

interface SettingsStore extends SettingsState {
  setMyLanguage: (lang: LangCode) => void;
  setCaptionSize: (size: CaptionSize) => void;
  setVibrate: (vibrate: boolean) => void;
  setDarkMode: (darkMode: boolean) => void;
  setNotifications: (notifications: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
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
}));

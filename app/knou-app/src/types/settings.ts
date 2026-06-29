import type { LangCode } from './meeting';

export type CaptionSize = 'small' | 'medium' | 'large';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: 'free' | 'pro' | 'enterprise';
  remainingMeetings: number;
}

export interface SettingsState {
  myLanguage: LangCode;
  captionSize: CaptionSize;
  vibrate: boolean;
  darkMode: boolean;
  notifications: boolean;
}

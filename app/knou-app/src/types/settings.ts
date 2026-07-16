import type { BackendLang, LangCode } from './meeting';

export type CaptionSize = 'small' | 'medium' | 'large';

/** 백엔드 `FontSize` enum과 1:1. */
export type BackendFontSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';

/** 내 프로필 + 채팅 설정 — 백엔드 `UserProfileResponse`와 1:1 (camelCase). */
export interface UserProfileResponse {
  userId: number;
  email: string;
  name: string;
  social: boolean;
  subscribed: boolean;
  remainingCount: number;
  language: BackendLang;
  fontSize: BackendFontSize;
  vibration: boolean;
}

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

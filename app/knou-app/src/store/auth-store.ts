import { create } from 'zustand';
import type { UserProfile } from '@/types/settings';

/**
 * 인증 상태. 구글 로그인 성공 시 [setAuth] 로 프로필 + 백엔드 신원(userId/JWT)을 채운다.
 * 백엔드 API 호출은 backendUserId(dev: X-User-Id) / backendToken(운영: Bearer)을 사용한다.
 */
interface AuthState {
  user: UserProfile | null;
  /** 백엔드 userId(Long). API 호출의 X-User-Id 로 사용. */
  backendUserId: number | null;
  /** 백엔드 발급 JWT(운영 인증용). */
  backendToken: string | null;
  isAuthenticated: boolean;
  /** 앱 시작 시 저장된 세션 복구 중인지. 게이트에서 스플래시 유지용. */
  isBootstrapping: boolean;

  setAuth: (args: { user: UserProfile; backendUserId: number; backendToken: string }) => void;
  setBootstrapping: (v: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  backendUserId: null,
  backendToken: null,
  isAuthenticated: false,
  isBootstrapping: true,

  setAuth: ({ user, backendUserId, backendToken }) =>
    set({ user, backendUserId, backendToken, isAuthenticated: true, isBootstrapping: false }),
  setBootstrapping: (v) => set({ isBootstrapping: v }),
  logout: () => set({ user: null, backendUserId: null, backendToken: null, isAuthenticated: false }),
}));

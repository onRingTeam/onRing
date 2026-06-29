import { create } from 'zustand';
import type { UserProfile } from '@/types/settings';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile) => void;
  logout: () => void;
}

const DEMO_USER: UserProfile = {
  id: 'u1',
  name: '김민준',
  email: 'minjun.kim@example.com',
  plan: 'pro',
  remainingMeetings: 12,
};

export const useAuthStore = create<AuthState>((set) => ({
  user: DEMO_USER,
  isAuthenticated: true,
  setUser: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

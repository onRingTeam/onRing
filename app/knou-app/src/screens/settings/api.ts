import type { BackendFontSize, UserProfileResponse } from '@/types/settings';
import type { BackendLang } from '@/types/meeting';
import { API_BASE } from '@/lib/config';
import { authHeaders } from '@/lib/api-headers';

/**
 * 내 프로필 + 채팅 설정 조회. (화면정의서 6-a, 6-c)
 * GET /api/users/me
 */
export async function fetchProfile(): Promise<UserProfileResponse> {
  const res = await fetch(`${API_BASE}/api/users/me`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`프로필 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * 프로필(회원명) 수정. (화면정의서 6-a-i)
 * PATCH /api/users/me/profile
 */
export async function updateProfile(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/users/me/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`프로필 수정 실패 (${res.status})`);
}

/**
 * 채팅 설정(언어 / 글씨 크기 / 진동) 수정. (화면정의서 6-c)
 * PATCH /api/users/me/chat-settings
 */
export async function updateChatSettings(settings: {
  language: BackendLang;
  fontSize: BackendFontSize;
  vibration: boolean;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/api/users/me/chat-settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`채팅 설정 수정 실패 (${res.status})`);
}

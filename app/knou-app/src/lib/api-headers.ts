import { useAuthStore } from '@/store';

/**
 * 백엔드 인증 헤더.
 *  - dev/local: 백엔드가 X-User-Id 로 사용자를 식별 (permitAll).
 *  - 운영: Authorization: Bearer <백엔드 JWT> 로 검증.
 * 둘 다 실어 보내면 환경에 맞게 백엔드가 사용한다. 미로그인 시 빈 객체.
 */
export function authHeaders(): Record<string, string> {
  const { backendUserId, backendToken } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (backendUserId != null) headers['X-User-Id'] = String(backendUserId);
  if (backendToken) headers['Authorization'] = `Bearer ${backendToken}`;
  return headers;
}

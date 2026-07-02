import { useAuthStore } from '@/store';
import { DEMO_USER_ID } from '@/lib/config';

/**
 * 백엔드 인증 헤더.
 *  - dev/local: 백엔드가 X-User-Id 로 사용자를 식별 (permitAll).
 *  - 운영: Authorization: Bearer <백엔드 JWT> 로 검증.
 * 둘 다 실어 보내면 환경에 맞게 백엔드가 사용한다.
 * 미로그인(backendUserId=null) 시 로컬 테스트 편의를 위해 DEMO_USER_ID 로 폴백.
 * TODO Phase 6: JWT 로그인 도입 후 폴백 제거.
 */
export function authHeaders(): Record<string, string> {
  const { backendUserId, backendToken } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  headers['X-User-Id'] = String(backendUserId ?? DEMO_USER_ID);
  if (backendToken) headers['Authorization'] = `Bearer ${backendToken}`;
  return headers;
}

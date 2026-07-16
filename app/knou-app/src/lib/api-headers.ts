import { useAuthStore } from '@/store';
import { DEMO_USER_ID, IS_LOCAL_BACKEND } from '@/lib/config';

/**
 * 백엔드 인증 헤더.
 *  - dev/local: 백엔드가 X-User-Id 로 사용자를 식별 (permitAll).
 *  - 운영: Authorization: Bearer <백엔드 JWT> 로 검증.
 * 둘 다 실어 보내면 환경에 맞게 백엔드가 사용한다.
 *
 * ⚠️ 미로그인(backendUserId=null) 시 DEMO_USER_ID 폴백은 **로컬 백엔드에서만** 허용한다.
 * 배포 백엔드(공유 DB)에서 DEMO(=user 1)로 폴백하면, 인증 완료 전 홈이 남의 회의를
 * 자기 것처럼 조회하게 된다(신원 혼선). 따라서 배포에서는 X-User-Id 를 아예 싣지 않는다
 * (해당 쿼리는 backendUserId 가 채워진 뒤에만 실행되도록 게이팅한다).
 * TODO Phase 6: JWT 로그인 도입 후 폴백 완전 제거.
 */
export function authHeaders(): Record<string, string> {
  const { backendUserId, backendToken } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  const uid = backendUserId ?? (IS_LOCAL_BACKEND ? DEMO_USER_ID : null);
  if (uid != null) headers['X-User-Id'] = String(uid);
  if (backendToken) headers['Authorization'] = `Bearer ${backendToken}`;
  return headers;
}

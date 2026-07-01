/** 서버 접속 설정. TODO: 환경별 분기 시 env(EXPO_PUBLIC_*)로 분리. */

/** REST API base (끝 슬래시 없음). */
export const API_BASE = 'https://devknou.shinlabs.app';

/**
 * 인증 도입 전 임시 사용자 ID (백엔드 `X-User-Id` 헤더용).
 * TODO Phase 6: JWT 로그인 도입 후 토큰/실제 userId로 대체.
 */
export const DEMO_USER_ID = 1;

/**
 * 앱 설정값 단일 소스.
 * 실제 값은 `.env` 의 `EXPO_PUBLIC_*` 에서 읽는다. (Metro 재시작 시 반영)
 * ⚠️ EXPO_PUBLIC_ 값은 번들에 박혀 노출됨 — 서버 URL·publishable key 만. 진짜 시크릿 금지.
 */
import { Platform } from 'react-native';

/** 로컬 백엔드 기본값(플랫폼별). 안드로이드 에뮬레이터 호스트PC = 10.0.2.2. */
const LOCAL_API_BASE = Platform.select({
  android: 'http://10.0.2.2:8080',
  default: 'http://localhost:8080',
});
const LOCAL_WS_URL = Platform.select({
  android: 'ws://10.0.2.2:8080/ws',
  default: 'ws://localhost:8080/ws',
});

/** REST API base (끝 슬래시 없음). */
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? LOCAL_API_BASE;

/**
 * 로컬 백엔드(localhost/10.0.2.2)를 가리키는지 여부.
 * 배포 백엔드에서는 DEMO 사용자 폴백을 금지해(=미인증 시 X-User-Id 미전송) 타인 데이터 노출을 막는다.
 */
export const IS_LOCAL_BACKEND = /localhost|10\.0\.2\.2/.test(API_BASE);

/** STOMP over WebSocket URL. */
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? LOCAL_WS_URL;

/** Supabase (구글 로그인용). publishable/anon key 만. */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * 인증 도입 전 임시 사용자 ID (백엔드 `X-User-Id` 헤더용).
 * TODO Phase 6: JWT 로그인 도입 후 토큰/실제 userId로 대체.
 */
export const DEMO_USER_ID = 1;

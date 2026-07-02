/** 서버 접속 설정. */
import { Platform } from 'react-native';

/**
 * 로컬 백엔드 기본 주소는 플랫폼마다 다르다.
 *  - 안드로이드 에뮬레이터: 호스트PC = 10.0.2.2
 *  - 웹/iOS 시뮬레이터: localhost
 * 원격 서버를 쓰려면 EXPO_PUBLIC_API_BASE 로 오버라이드.
 */
const LOCAL_API_BASE = Platform.select({
  android: 'http://10.0.2.2:8080',
  default: 'http://localhost:8080',
});

/** REST API base (끝 슬래시 없음). */
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? LOCAL_API_BASE;

/**
 * 인증 도입 전 임시 사용자 ID (백엔드 `X-User-Id` 헤더용).
 * TODO Phase 6: JWT 로그인 도입 후 토큰/실제 userId로 대체.
 */
export const DEMO_USER_ID = 1;

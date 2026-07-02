import { Redirect } from 'expo-router';

/**
 * OAuth 콜백 딥링크(knouapp://auth/callback) 착지 라우트.
 *
 * 코드→세션 교환은 signInWithGoogle 의 openAuthSessionAsync 가 이미 처리하므로
 * 여기서 재교환하지 않는다(같은 code 중복 소비 → 에러 방지).
 * 이 라우트는 "갈 곳 없는 딥링크"가 Unmatched Route 로 뜨는 것만 막고,
 * 루트 게이트([_layout])가 로그인 상태에 따라 (tabs)/login 으로 보내도록 넘긴다.
 */
export default function AuthCallback() {
  return <Redirect href="/login" />;
}

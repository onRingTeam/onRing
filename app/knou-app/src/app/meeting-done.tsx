import { Redirect } from 'expo-router';

/**
 * 회의 종료/나가기 복귀 딥링크(knouapp://meeting-done) 착지 라우트.
 *
 * 실제 처리(요약 이동/나가기 확인)는 MeetingWebScreen 의 openAuthSessionAsync 가
 * 이 복귀를 가로채 수행하므로, 여기까지 오는 경우는 세션이 이미 닫힌 예외 상황뿐이다.
 * "갈 곳 없는 딥링크"가 Unmatched Route 로 뜨는 것만 막고 홈으로 보낸다.
 */
export default function MeetingDone() {
  return <Redirect href="/(tabs)" />;
}

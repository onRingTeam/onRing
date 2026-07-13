import { MeetingWebScreen } from '@/screens/meeting-room/meeting-web-screen';

export default function MeetingRoute() {
  // 회의 진행 화면은 웹(WebView)으로 구동한다 — RN WebSocket STOMP 연결 불안정 우회.
  // 네이티브 구현(STT·WebRTC 포함)은 meeting-screen.tsx 에 보존.
  return <MeetingWebScreen />;
}

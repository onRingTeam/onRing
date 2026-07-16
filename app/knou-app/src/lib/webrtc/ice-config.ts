/**
 * WebRTC ICE 서버 설정.
 *
 * 현재(임시): Google 무료 STUN + Open Relay(Metered) 무료 TURN.
 * ⚠️ 공개 무료 TURN은 공유·SLA 없음 → 실서비스 전 coturn 자체 호스팅으로 교체.
 * (docs/음성통화-접근성-회의-설계.md §5-C)
 */
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

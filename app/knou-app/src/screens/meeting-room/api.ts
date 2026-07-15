import { API_BASE } from '@/lib/config';
import { authHeaders } from '@/lib/api-headers';
import type { MeetingMessageDto } from '@/types/meeting';

export type { MeetingMessageDto };

/**
 * 놓친 채팅 메시지 조회 (시간순). 서버 인메모리 버퍼 — 진행중 회의만, 종료 시 폐기됨.
 * 웹소켓 재연결 시 마지막 수신 시각(after) 이후 메시지를 복구할 때 사용.
 * GET /api/meetings/{meetingId}/messages?after=
 */
export async function fetchMessages(meetingId: number, after?: string): Promise<MeetingMessageDto[]> {
  const query = after ? `?after=${encodeURIComponent(after)}` : '';
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/messages${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`메시지 조회 실패 (${res.status})`);
  return res.json();
}
/**
 * 이 회의가 종료됐는지 조회.
 * 웹소켓 재연결 시, 끊긴 사이 개설자가 종료해 STOMP 종료(status) 이벤트를 놓쳤는지 확인하는 용도.
 * (종료 브로드캐스트는 일회성이라 끊긴 참여자는 복구 경로가 없음 → 재연결 시 이걸로 보정)
 *
 * ⚠️ 이전 구현은 `/active`(내 진행중 회의)와 비교했는데, attendance 가 없는 사용자(딥링크
 * 입장)·잔재 IN_PROGRESS 회의에서 null/딴 회의가 와서 "종료됨" 오탐 → 입장 즉시 요약으로
 * 튕기는 버그가 있었다. 회의 자체의 상태를 직접 조회해야 정확하다.
 * durationSec 은 종료 처리 시에만 채워진다 (진행중 = null). GET /api/meetings/{meetingId}
 */
export async function fetchMeetingEnded(meetingId: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`회의 상태 조회 실패 (${res.status})`);
  const detail = await res.json();
  return detail?.durationSec != null;
}

/**
 * 회의 종료. 개설자만 종료 가능(서버에서 개설여부 검증). (화면정의서 5-a-1)
 * POST /api/meetings/{meetingId}/end
 */
export async function endMeeting(meetingId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/end`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`회의 종료 실패 (${res.status})`);
}

/**
 * 회의 나가기(참여자). 내 참석 레코드 use_yn=N 처리 → 진행중 회의에서 제외되어
 * 홈에서 새 회의 개설이 가능해진다. 개설자는 호출 불가(서버 403 — 종료를 사용).
 * POST /api/meetings/{meetingId}/leave
 */
export async function leaveMeeting(meetingId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/leave`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`회의 나가기 실패 (${res.status})`);
}
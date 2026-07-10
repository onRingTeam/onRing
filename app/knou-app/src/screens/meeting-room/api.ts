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
 * 내 진행중(IN_PROGRESS) 회의의 meetingId 조회 (없으면 null).
 * 웹소켓 재연결 시, 끊긴 사이 개설자가 종료해 STOMP 종료(status) 이벤트를 놓쳤는지 확인하는 용도.
 * (종료 브로드캐스트는 일회성이라 끊긴 참여자는 복구 경로가 없음 → 재연결 시 이걸로 보정)
 * GET /api/meetings/active
 */
export async function fetchActiveMeetingId(): Promise<number | null> {
  const res = await fetch(`${API_BASE}/api/meetings/active`, { headers: authHeaders() });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`진행중 회의 조회 실패 (${res.status})`);
  const room = await res.json();
  return typeof room?.meetingId === 'number' ? room.meetingId : null;
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
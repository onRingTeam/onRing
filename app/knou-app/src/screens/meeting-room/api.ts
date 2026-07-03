import { API_BASE } from '@/lib/config';
import { authHeaders } from '@/lib/api-headers';

/** GET /api/meetings/{id}/messages 응답 항목 (서버 MeetingMessageResponse). */
export interface MeetingMessageDto {
  messageId: number;
  speakerName: string;
  spokenAt: string;
  original: string;
  translated: string | null;
}

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

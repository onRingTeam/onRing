import { API_BASE } from '@/lib/config';
import { authHeaders } from '@/lib/api-headers';

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

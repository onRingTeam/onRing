import type { MeetingRecord } from '@/types/meeting';
import {
  MOCK_RECENT_MEETINGS_RESPONSE,
  mapRecentMeeting,
  type RecentMeetingDto,
} from './mock-data';

/**
 * 최근 회의 목록 조회.
 * 지금은 하드코딩 목 데이터를 매핑해서 반환한다.
 * 실제 서버가 붙으면 아래 주석 블록으로 교체하면 된다.
 */
export async function fetchRecentMeetings(limit = 3): Promise<MeetingRecord[]> {
  // ── 실제 API 연동 시 (주석 해제) ─────────────────────────────
  // const res = await fetch(`${API_BASE}/meetings/recent?limit=${limit}`);
  // if (!res.ok) throw new Error('최근 회의 조회 실패');
  // const data: RecentMeetingDto[] = await res.json();
  // return data.map(mapRecentMeeting);
  // ────────────────────────────────────────────────────────────

  // 임시: 네트워크 지연 흉내 + 목 응답 매핑
  await new Promise((resolve) => setTimeout(resolve, 300));
  const data: RecentMeetingDto[] = MOCK_RECENT_MEETINGS_RESPONSE.slice(0, limit);
  return data.map(mapRecentMeeting);
}

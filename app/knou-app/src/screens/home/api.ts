
import type { LangCode, MeetingRecord, MeetingRoomResponse } from '@/types/meeting';
import { toBackendLang } from '@/types/meeting';
import { API_BASE } from '@/lib/config';
import { authHeaders } from '@/lib/api-headers';
/**
 * 신규 회의 생성. 회의명·내 언어로 생성하고 회의실 진입 정보(meetingId 포함)를 반환.
 * POST /api/meetings
 */
export async function createMeeting(title: string, language: LangCode): Promise<MeetingRoomResponse> {
  const res = await fetch(`${API_BASE}/api/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ title, language: toBackendLang(language) }),
  });
  if (!res.ok) throw new Error(`회의 생성 실패 (${res.status})`);
  return res.json();
}

import {
  MOCK_RECENT_MEETINGS_RESPONSE,
  mapRecentMeeting,
  type RecentMeetingDto,
} from './mock-data';

/**
 * 회의 코드로 참여. 성공 시 회의실 진입 정보(meetingId 포함)를 반환한다.
 * POST /api/meetings/join
 */
export async function joinMeeting(meetingCode: string): Promise<MeetingRoomResponse> {
  const res = await fetch(`${API_BASE}/api/meetings/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ meetingCode }),
  });
  if (!res.ok) throw new Error(`회의 참여 실패 (${res.status})`);
  return res.json();
}

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

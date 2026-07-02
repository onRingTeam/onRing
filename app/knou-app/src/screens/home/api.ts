import type { LangCode, MeetingListItem, MeetingRoomResponse } from '@/types/meeting';
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
 * 최근 회의 목록 조회 (홈 노출용). 백엔드가 최신순 4건을 반환한다.
 * GET /api/meetings/recent
 */
export async function fetchRecentMeetings(): Promise<MeetingListItem[]> {
  const res = await fetch(`${API_BASE}/api/meetings/recent`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`최근 회의 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * 현재 진행중인 내 회의 조회. 없으면 204 → null 반환. (화면정의서 1-c, 2-b-i-1)
 * GET /api/meetings/active
 */
export async function fetchActiveMeeting(): Promise<MeetingRoomResponse | null> {
  const res = await fetch(`${API_BASE}/api/meetings/active`, {
    headers: { ...authHeaders() },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`진행중 회의 조회 실패 (${res.status})`);
  return res.json();
}

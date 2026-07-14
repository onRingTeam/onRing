import type { LangCode, MeetingDetail, MeetingListItem, MeetingMessageDto } from '@/types/meeting';
import { toBackendLang } from '@/types/meeting';
import { API_BASE } from '@/lib/config';
import { authHeaders } from '@/lib/api-headers';

/** 공통 페이지 응답 래퍼 — 백엔드 `PageResponse<T>`와 1:1. */
export interface PageResponse<T> {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

/**
 * 회의록 목록/검색. 회의명·코드·요약 like + 즐겨찾기 필터 + 페이징. (화면정의서 3-b, 3-c, 3-d)
 * GET /api/meetings
 */
export async function fetchMeetings(params: {
  keyword?: string;
  favoriteOnly?: boolean;
  page?: number;
  size?: number;
}): Promise<PageResponse<MeetingListItem>> {
  const q = new URLSearchParams();
  if (params.keyword?.trim()) q.set('keyword', params.keyword.trim());
  if (params.favoriteOnly) q.set('favoriteOnly', 'true');
  q.set('page', String(params.page ?? 0));
  q.set('size', String(params.size ?? 20));

  const res = await fetch(`${API_BASE}/api/meetings?${q.toString()}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`회의록 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * 상세회의 - AI 요약 조회. (화면정의서 4-b, 4-c)
 * GET /api/meetings/{meetingId}
 */
export async function fetchMeetingDetail(meetingId: number): Promise<MeetingDetail> {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`상세회의 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * 상세회의 - 전체 대화 (종료 회의). 저장된 발화 기록을 시간순으로 반환. (화면정의서 4-d)
 * GET /api/meetings/{meetingId}/transcript
 */
export async function fetchMeetingTranscript(meetingId: number): Promise<MeetingMessageDto[]> {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/transcript`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`전체 대화 조회 실패 (${res.status})`);
  return res.json();
}

/**
 * 회의록 선택 삭제. 내 참석 레코드의 use_yn 만 N 으로 바꾸는 참석자별 소프트 삭제.
 * POST /api/meetings/delete
 */
export async function deleteMeetings(meetingIds: number[]): Promise<void> {
  const res = await fetch(`${API_BASE}/api/meetings/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ meetingIds }),
  });
  if (!res.ok) throw new Error(`회의록 삭제 실패 (${res.status})`);
}

/**
 * 즐겨찾기 토글. (화면정의서 3-c, 3-d)
 * PATCH /api/meetings/{meetingId}/favorite
 */
export async function toggleFavorite(meetingId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/favorite`, {
    method: 'PATCH',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`즐겨찾기 변경 실패 (${res.status})`);
}

/**
 * 텍스트 번역. 전체 대화 탭의 메시지를 설정 언어(myLanguage)로 Gemini 번역한다. (화면정의서 4-d)
 * POST /api/translations
 */
export async function translateText(text: string, targetLang: LangCode): Promise<string> {
  const res = await fetch(`${API_BASE}/api/translations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text, targetLang: toBackendLang(targetLang) }),
  });
  if (!res.ok) throw new Error(`번역 실패 (${res.status})`);
  return ((await res.json()) as { translatedText: string }).translatedText;
}

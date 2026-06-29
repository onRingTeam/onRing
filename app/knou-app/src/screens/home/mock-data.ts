import type { MeetingRecord } from '@/types/meeting';

/**
 * 서버 연동 전 임시 하드코딩 데이터.
 * 실제 API가 붙으면 이 파일은 삭제하고 api.ts의 fetch만 살리면 된다.
 */

/** 서버 응답(raw) 형태를 흉내낸 DTO — 실제 API 응답 스키마와 동일하게 둔다. */
export interface RecentMeetingDto {
  meeting_id: string;
  title: string;
  invite_code: string;
  started_at: string; // ISO 문자열
  duration_sec: number;
  participant_count: number;
  primary_language: string;
}

export const MOCK_RECENT_MEETINGS_RESPONSE: RecentMeetingDto[] = [
  {
    meeting_id: 'm1',
    title: '스프린트 플래닝 #12',
    invite_code: 'ABC123',
    started_at: '2026-06-22T10:00:00.000Z',
    duration_sec: 3120,
    participant_count: 4,
    primary_language: 'ko',
  },
  {
    meeting_id: 'm2',
    title: 'UX 리뷰 세션',
    invite_code: 'DEF456',
    started_at: '2026-06-20T14:00:00.000Z',
    duration_sec: 2280,
    participant_count: 3,
    primary_language: 'ko',
  },
  {
    meeting_id: 'm3',
    title: '팀 주간 스탠드업',
    invite_code: 'GHI789',
    started_at: '2026-06-18T09:00:00.000Z',
    duration_sec: 1140,
    participant_count: 6,
    primary_language: 'ko',
  },
];

/** DTO(snake_case 서버 응답) → 앱 도메인 모델(MeetingRecord) 매핑 */
export function mapRecentMeeting(dto: RecentMeetingDto): MeetingRecord {
  return {
    id: dto.meeting_id,
    title: dto.title,
    code: dto.invite_code,
    startedAt: new Date(dto.started_at).getTime(),
    durationSeconds: dto.duration_sec,
    speakers: [],
    captions: [],
    language: (dto.primary_language as MeetingRecord['language']) ?? 'ko',
  };
}

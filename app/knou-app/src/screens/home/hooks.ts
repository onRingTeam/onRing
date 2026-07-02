import { useMutation, useQuery } from '@tanstack/react-query';

import type { LangCode } from '@/types/meeting';
import { createMeeting, fetchRecentMeetings, joinMeeting } from './api';

/** 최근 회의 목록 조회 쿼리 */
export function useRecentMeetings(limit = 3) {
  return useQuery({
    queryKey: ['recent-meetings', limit],
    queryFn: () => fetchRecentMeetings(limit),
  });
}

/** 회의 코드로 참여 (성공 시 meetingId 반환) */
export function useJoinMeeting() {
  return useMutation({
    mutationFn: (meetingCode: string) => joinMeeting(meetingCode),
  });
}

/** 신규 회의 생성 (성공 시 meetingId·회의 코드 반환) */
export function useCreateMeeting() {
  return useMutation({
    mutationFn: (params: { title: string; language: LangCode }) =>
      createMeeting(params.title, params.language),
  });
}

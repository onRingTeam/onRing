import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LangCode } from '@/types/meeting';
import { createMeeting, fetchActiveMeeting, fetchRecentMeetings, joinMeeting } from './api';

/** 최근 회의 목록 조회 쿼리 (홈 노출용). */
export function useRecentMeetings() {
  return useQuery({
    queryKey: ['recent-meetings'],
    queryFn: fetchRecentMeetings,
  });
}

/** 현재 진행중인 내 회의 조회 (없으면 null). */
export function useActiveMeeting() {
  return useQuery({
    queryKey: ['active-meeting'],
    queryFn: fetchActiveMeeting,
  });
}

/** 회의 코드로 참여 (성공 시 meetingId 반환). 진행중 회의 캐시 갱신. */
export function useJoinMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meetingCode: string) => joinMeeting(meetingCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-meeting'] });
    },
  });
}

/** 신규 회의 생성 (성공 시 meetingId·회의 코드 반환). 진행중/최근 회의 캐시 갱신. */
export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { title: string; language: LangCode }) =>
      createMeeting(params.title, params.language),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-meeting'] });
      qc.invalidateQueries({ queryKey: ['recent-meetings'] });
    },
  });
}

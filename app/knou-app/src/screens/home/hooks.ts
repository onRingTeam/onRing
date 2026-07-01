import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchRecentMeetings, joinMeeting } from './api';

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

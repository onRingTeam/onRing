import { useQuery } from '@tanstack/react-query';

import { fetchRecentMeetings } from './api';

/** 최근 회의 목록 조회 쿼리 */
export function useRecentMeetings(limit = 3) {
  return useQuery({
    queryKey: ['recent-meetings', limit],
    queryFn: () => fetchRecentMeetings(limit),
  });
}

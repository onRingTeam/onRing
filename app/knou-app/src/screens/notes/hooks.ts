import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MeetingListItem } from '@/types/meeting';
import { fetchMeetingDetail, fetchMeetings, toggleFavorite } from './api';

export interface UseMeetingsOptions {
  keyword: string;
  favoriteOnly: boolean;
}

/** 회의록 목록/검색 쿼리 (회의명·코드·요약 like + 즐겨찾기 필터). */
export function useMeetings({ keyword, favoriteOnly }: UseMeetingsOptions) {
  return useQuery({
    queryKey: ['meetings', { keyword, favoriteOnly }],
    queryFn: () => fetchMeetings({ keyword, favoriteOnly }),
    select: (page) => page.content,
  });
}

/** 상세회의 - AI 요약 쿼리. */
export function useMeetingDetail(meetingId: number) {
  return useQuery({
    queryKey: ['meeting-detail', meetingId],
    queryFn: () => fetchMeetingDetail(meetingId),
    enabled: Number.isFinite(meetingId),
  });
}

/** 즐겨찾기 토글 뮤테이션 (성공 시 목록 캐시 무효화). */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: number) => toggleFavorite(meetingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] });
      qc.invalidateQueries({ queryKey: ['recent-meetings'] });
    },
  });
}

export type { MeetingListItem };

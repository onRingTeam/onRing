import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MeetingListItem } from '@/types/meeting';
import {
  deleteMeetings,
  fetchMeetingDetail,
  fetchMeetingTranscript,
  fetchMeetings,
  toggleFavorite,
} from './api';

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

/** 요약 생성 대기 폴링 간격(ms). */
const SUMMARY_POLL_INTERVAL_MS = 3000;
/** 폴링 최대 횟수(약 60초). 채팅 0건 회의 등 요약이 영영 안 생기는 경우 무한 폴링 방지. */
const SUMMARY_POLL_MAX = 20;

/**
 * 상세회의 - AI 요약 쿼리.
 * @param waitForSummary 방금 종료한 회의처럼 요약 생성을 기다려야 하는 경우 true.
 *   summary 가 채워질 때까지(최대 약 60초) 폴링하고, 도착하거나 상한 도달 시 중단한다.
 */
export function useMeetingDetail(meetingId: number, options?: { waitForSummary?: boolean }) {
  const waitForSummary = options?.waitForSummary ?? false;
  return useQuery({
    queryKey: ['meeting-detail', meetingId],
    queryFn: () => fetchMeetingDetail(meetingId),
    enabled: Number.isFinite(meetingId),
    refetchInterval: (query) => {
      if (!waitForSummary) return false;
      if (query.state.data?.summary != null) return false; // 요약 도착 → 중단
      if (query.state.dataUpdateCount >= SUMMARY_POLL_MAX) return false; // 상한 → 포기
      return SUMMARY_POLL_INTERVAL_MS;
    },
  });
}

/**
 * 상세회의 - 전체 대화 쿼리. 종료 회의의 대화는 불변이므로 staleTime 무한.
 * @param options.enabled 전체 대화 탭 진입 시에만 조회하도록 lazy 하게 켠다.
 */
export function useMeetingTranscript(meetingId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['meeting-transcript', meetingId],
    queryFn: () => fetchMeetingTranscript(meetingId),
    enabled: Number.isFinite(meetingId) && (options?.enabled ?? true),
    staleTime: Infinity,
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

/** 회의록 선택 삭제 뮤테이션 (내 참석 레코드 use_yn=N, 성공 시 목록 캐시 무효화). */
export function useDeleteMeetings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meetingIds: number[]) => deleteMeetings(meetingIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] });
      qc.invalidateQueries({ queryKey: ['recent-meetings'] });
    },
  });
}

export type { MeetingListItem };

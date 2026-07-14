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
 *
 * 요약이 없으면(summary=null) 폴링한다. 백엔드는 상세 조회마다 요약이 없을 때 온디맨드로
 * 재생성을 트리거([MeetingSummaryRegenerationListener])해 완료되면 DB 에 저장하므로,
 * 방금 종료한 회의뿐 아니라 예전에 열어 요약이 비어 있던 회의도 다시 열면 폴링으로
 * 재생성된 요약을 받아 표시한다. 최대 약 60초 폴링 후(채팅 0건 회의 등) 포기한다.
 *
 * @param waitForSummary (호환용) 방금 종료한 회의 진입 시 전달. 폴링 자체는 summary 유무로
 *   판단하므로 값과 무관하게 동작하지만, 의미를 드러내기 위해 유지한다.
 * @returns 쿼리 결과에 `isSummaryPending`(재생성을 기다리는 중 = '생성 중' 표시) 을 덧붙여 반환.
 */
export function useMeetingDetail(meetingId: number, _options?: { waitForSummary?: boolean }) {
  const qc = useQueryClient();
  const queryKey = ['meeting-detail', meetingId] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => fetchMeetingDetail(meetingId),
    enabled: Number.isFinite(meetingId),
    refetchInterval: (q) => {
      if (q.state.data?.summary != null) return false; // 요약 도착 → 중단
      if (q.state.dataUpdateCount >= SUMMARY_POLL_MAX) return false; // 상한 → 포기
      return SUMMARY_POLL_INTERVAL_MS; // 요약 없음 → 재생성 완료까지 폴링
    },
  });

  // 폴링 횟수는 쿼리 상태(dataUpdateCount)에서 읽는다 — v5 useQuery 결과엔 노출되지 않음.
  // 컴포넌트는 쿼리 갱신마다 리렌더되므로 렌더 시점의 최신 카운트를 읽는다.
  const updateCount = qc.getQueryState(queryKey)?.dataUpdateCount ?? 0;
  // 상세는 왔지만 요약이 아직 없고 폴링 상한에 닿지 않음 → 백엔드 재생성을 기다리는 중.
  const isSummaryPending =
    query.data != null && query.data.summary == null && updateCount < SUMMARY_POLL_MAX;

  return { ...query, isSummaryPending };
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

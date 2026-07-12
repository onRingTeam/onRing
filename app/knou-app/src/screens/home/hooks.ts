import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LangCode } from '@/types/meeting';
import { useAuthStore, useMeetingStore } from '@/store';
import { createMeeting, fetchActiveMeeting, fetchRecentMeetings, joinMeeting } from './api';

/**
 * 최근 회의 목록 조회 쿼리 (홈 노출용).
 * backendUserId 가 채워진(=인증 완료) 뒤에만 실행하고, 캐시 키에 userId 를 포함한다.
 * (미인증 시 DEMO 사용자로 남의 회의를 조회·캐시하는 신원 혼선 방지 — [authHeaders] 참고)
 */
export function useRecentMeetings() {
  const backendUserId = useAuthStore((s) => s.backendUserId);
  return useQuery({
    queryKey: ['recent-meetings', backendUserId],
    queryFn: fetchRecentMeetings,
    enabled: backendUserId != null,
  });
}

/**
 * 서버(GET /api/meetings/active) 기준 진행중 회의를 스토어에 동기화하는 콜백.
 * 홈 포커스 시 호출해 종료/생성 후 상태 정합을 맞춘다.
 */
export function useHydrateActiveMeeting() {
  const setActiveMeeting = useMeetingStore((s) => s.setActiveMeeting);
  return useCallback(() => {
    fetchActiveMeeting()
      .then(setActiveMeeting)
      .catch((e) => console.warn('[home] 진행중 회의 동기화 실패', e));
  }, [setActiveMeeting]);
}

/**
 * 회의 코드로 참여 (성공 시 meetingId 반환).
 * 진행중 회의 상태를 스토어에 즉시 반영한다.
 */
export function useJoinMeeting() {
  return useMutation({
    mutationFn: (meetingCode: string) => joinMeeting(meetingCode),
    onSuccess: (room) => {
      useMeetingStore.getState().setActiveMeeting(room);
    },
  });
}

/**
 * 신규 회의 생성 (성공 시 meetingId·회의 코드 반환).
 * 진행중 회의 상태를 스토어에 즉시 반영하고, 최근 회의 목록 캐시를 갱신한다.
 */
export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { title: string; language: LangCode }) =>
      createMeeting(params.title, params.language),
    onSuccess: (room) => {
      useMeetingStore.getState().setActiveMeeting(room);
      qc.invalidateQueries({ queryKey: ['recent-meetings'] });
    },
  });
}

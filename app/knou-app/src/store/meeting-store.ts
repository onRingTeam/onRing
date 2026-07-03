import { create } from 'zustand';
import type { CaptionItem, MeetingRoomResponse } from '@/types/meeting';

interface MeetingState {
  /**
   * 서버 기준 "현재 진행중인 내 회의" (단일 소스).
   * 없으면 null. 홈 회의생성 분기·회의 탭 아이콘 활성/이동 판단에 사용.
   */
  activeMeeting: MeetingRoomResponse | null;
  inMeeting: boolean;
  currentMeetingId?: string;
  startedAt?: number;
  captions: CaptionItem[];
  /** 현재 방 참여자 이름 목록 (presence 토픽) */
  participants: string[];
  setInMeeting: (inMeeting: boolean) => void;
  setCurrentMeetingId: (id: string) => void;
  /** 진행중 회의 상태를 직접 설정 (생성/참여 성공·서버 동기화 시 반영). */
  setActiveMeeting: (meeting: MeetingRoomResponse | null) => void;
  /** 진행중 회의 상태 해제 (종료 시). */
  clearActiveMeeting: () => void;
  startMeeting: (meetingId: string) => void;
  addCaption: (caption: CaptionItem) => void;
  setParticipants: (participants: string[]) => void;
  clearMeeting: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  activeMeeting: null,
  inMeeting: false,
  captions: [],
  participants: [],
  setInMeeting: (inMeeting) => set({ inMeeting }),
  setCurrentMeetingId: (id) => set({ currentMeetingId: id }),
  setActiveMeeting: (meeting) => set({ activeMeeting: meeting }),
  clearActiveMeeting: () => set({ activeMeeting: null }),
  startMeeting: (meetingId) =>
    set({ inMeeting: true, currentMeetingId: meetingId, startedAt: Date.now(), captions: [], participants: [] }),
  addCaption: (caption) => set((state) => ({ captions: [...state.captions, caption] })),
  setParticipants: (participants) => set({ participants }),
  clearMeeting: () =>
    set({ inMeeting: false, currentMeetingId: undefined, captions: [], participants: [] }),
}));

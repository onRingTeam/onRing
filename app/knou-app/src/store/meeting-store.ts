import { create } from 'zustand';
import type { CaptionItem } from '@/types/meeting';

interface MeetingState {
  inMeeting: boolean;
  currentMeetingId?: string;
  startedAt?: number;
  captions: CaptionItem[];
  /** 현재 방 참여자 이름 목록 (presence 토픽) */
  participants: string[];
  setInMeeting: (inMeeting: boolean) => void;
  setCurrentMeetingId: (id: string) => void;
  startMeeting: (meetingId: string) => void;
  addCaption: (caption: CaptionItem) => void;
  setParticipants: (participants: string[]) => void;
  clearMeeting: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  inMeeting: false,
  captions: [],
  participants: [],
  setInMeeting: (inMeeting) => set({ inMeeting }),
  setCurrentMeetingId: (id) => set({ currentMeetingId: id }),
  startMeeting: (meetingId) =>
    set({ inMeeting: true, currentMeetingId: meetingId, startedAt: Date.now(), captions: [], participants: [] }),
  addCaption: (caption) => set((state) => ({ captions: [...state.captions, caption] })),
  setParticipants: (participants) => set({ participants }),
  clearMeeting: () =>
    set({ inMeeting: false, currentMeetingId: undefined, captions: [], participants: [] }),
}));

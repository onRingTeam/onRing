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
  // 재연결 복구(REST)와 실시간 수신(STOMP)이 겹칠 수 있어 id 중복 제거 + 시간순 유지
  addCaption: (caption) =>
    set((state) => {
      if (state.captions.some((c) => c.id === caption.id)) return state;
      return { captions: [...state.captions, caption].sort((a, b) => a.timestamp - b.timestamp) };
    }),
  setParticipants: (participants) => set({ participants }),
  clearMeeting: () =>
    set({ inMeeting: false, currentMeetingId: undefined, captions: [], participants: [] }),
}));

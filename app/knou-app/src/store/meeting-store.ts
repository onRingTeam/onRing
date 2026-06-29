import { create } from 'zustand';
import type { CaptionItem } from '@/types/meeting';

interface MeetingState {
  inMeeting: boolean;
  currentMeetingId?: string;
  startedAt?: number;
  captions: CaptionItem[];
  setInMeeting: (inMeeting: boolean) => void;
  setCurrentMeetingId: (id: string) => void;
  addCaption: (caption: CaptionItem) => void;
  clearMeeting: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  inMeeting: false,
  captions: [],
  setInMeeting: (inMeeting) => set({ inMeeting }),
  setCurrentMeetingId: (id) => set({ currentMeetingId: id }),
  addCaption: (caption) => set((state) => ({ captions: [...state.captions, caption] })),
  clearMeeting: () => set({ inMeeting: false, currentMeetingId: undefined, captions: [] }),
}));

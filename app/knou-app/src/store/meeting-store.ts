import { create } from 'zustand';
import type { CaptionItem } from '@/types/meeting';

interface MeetingState {
  inMeeting: boolean;
  currentMeetingId: string | null;
  startedAt: number | null;
  captions: CaptionItem[];
  setInMeeting: (inMeeting: boolean) => void;
  setCurrentMeetingId: (id: string | null) => void;
  setStartedAt: (timestamp: number | null) => void;
  addCaption: (caption: CaptionItem) => void;
  setCaptions: (captions: CaptionItem[]) => void;
  clearMeeting: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  inMeeting: false,
  currentMeetingId: null,
  startedAt: null,
  captions: [],
  setInMeeting: (inMeeting) => set({ inMeeting }),
  setCurrentMeetingId: (id) => set({ currentMeetingId: id }),
  setStartedAt: (timestamp) => set({ startedAt: timestamp }),
  addCaption: (caption) => set((state) => ({ captions: [...state.captions, caption] })),
  setCaptions: (captions) => set({ captions }),
  clearMeeting: () => set({ inMeeting: false, currentMeetingId: null, startedAt: null, captions: [] }),
}));

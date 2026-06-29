import type { CaptionItem } from '@/types/meeting';
import { useElapsed } from '@/hooks/use-elapsed';
import { useMeetingStore } from '@/store';

export function useMeetingSession() {
  const inMeeting = useMeetingStore((s) => s.inMeeting);
  const startedAt = useMeetingStore((s) => s.startedAt);
  const captions = useMeetingStore((s) => s.captions);
  const clearMeeting = useMeetingStore((s) => s.clearMeeting);

  const elapsed = useElapsed(startedAt ?? null);

  const endMeeting = (finalCaptions: CaptionItem[]) => {
    useMeetingStore.setState({ captions: finalCaptions });
    clearMeeting();
  };

  return { inMeeting, startedAt, captions, elapsed, endMeeting };
}

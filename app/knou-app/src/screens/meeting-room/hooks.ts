import { useCallback, useEffect, useRef } from 'react';

import type { CaptionItem, ChatMessageRequest, ChatMessageResponse } from '@/types/meeting';
import { fromBackendLang } from '@/types/meeting';
import { useElapsed } from '@/hooks/use-elapsed';
import { useMeetingStore } from '@/store';
import { MeetingSocket } from '@/lib/websocket';

/** 서버 채팅 메시지(STOMP) → 화면 자막(CaptionItem) 매핑 */
function toCaption(msg: ChatMessageResponse): CaptionItem {
  const lang = fromBackendLang(msg.lang);
  return {
    id: `${msg.senderName}-${msg.sentAt}`,
    speaker: { id: msg.senderName, name: msg.senderName, language: lang },
    text: msg.message,
    // TODO Phase 4-2: 서버가 수신자 언어로 번역한 translated 필드 제공 시 매핑
    timestamp: Date.parse(msg.sentAt) || Date.now(),
  };
}

/**
 * 회의 화면이 켜져 있는 동안만 STOMP 연결을 유지하고,
 * 구독한 메시지를 자막(store)에 반영한다. 화면을 벗어나면 자동으로 해제한다.
 *
 * @param meetingId 회의 참여(POST /api/meetings/join) 응답의 meetingId. 없으면 연결하지 않음.
 * @returns 서버로 메시지를 발행하는 send 함수
 */
export function useMeetingConnection(meetingId: number | null, senderName: string) {
  const addCaption = useMeetingStore((s) => s.addCaption);
  const setParticipants = useMeetingStore((s) => s.setParticipants);
  const socketRef = useRef<MeetingSocket | null>(null);

  useEffect(() => {
    if (meetingId === null) return;

    const socket = new MeetingSocket();
    socket.connect(meetingId, {
      joinName: senderName,
      onMessage: (msg) => addCaption(toCaption(msg)),
      onParticipants: (list) => setParticipants(list),
    });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [meetingId, senderName, addCaption, setParticipants]);

  const send = useCallback((payload: ChatMessageRequest) => {
    socketRef.current?.send(payload);
  }, []);

  return { send };
}

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

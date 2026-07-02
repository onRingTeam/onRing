import { useCallback, useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import type { CaptionItem, ChatMessageRequest, ChatMessageResponse } from '@/types/meeting';
import { fromBackendLang } from '@/types/meeting';
import { useElapsed } from '@/hooks/use-elapsed';
import { useMeetingStore } from '@/store';
import { MeetingSocket } from '@/lib/websocket';
import { MeshVoiceCall } from '@/lib/webrtc/mesh-voice-call';

/** Android 마이크 권한 요청 (iOS는 네이티브 권한 팝업 자동). */
async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

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
  const meshRef = useRef<MeshVoiceCall | null>(null);
  // 세션 고유 peerId (Mesh 시그널링 식별자)
  const peerIdRef = useRef<string>(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (meetingId === null) return;

    const socket = new MeetingSocket();
    const mesh = new MeshVoiceCall({
      peerId: peerIdRef.current,
      sendSignal: (msg) => socket.sendSignal(msg),
    });

    socket.connect(meetingId, {
      joinName: senderName,
      onMessage: (msg) => addCaption(toCaption(msg)),
      onParticipants: (list) => setParticipants(list),
      onSignal: (msg) => void mesh.handleSignal(msg),
      onConnect: async () => {
        // 회의 입장 시 음성통화(WebRTC) 자동 시작. 마이크 권한 필요.
        if (await ensureMicPermission()) {
          await mesh.start().catch((e) => console.warn('[voice] start 실패', e));
        } else {
          console.warn('[voice] 마이크 권한 거부됨');
        }
      },
    });
    socketRef.current = socket;
    meshRef.current = mesh;

    return () => {
      mesh.stop();
      socket.disconnect();
      socketRef.current = null;
      meshRef.current = null;
    };
  }, [meetingId, senderName, addCaption, setParticipants]);

  const send = useCallback((payload: ChatMessageRequest) => {
    socketRef.current?.send(payload);
  }, []);

  /** 마이크 on/off (WebRTC 송신 트랙 토글) */
  const setMicEnabled = useCallback((enabled: boolean) => {
    meshRef.current?.setMicEnabled(enabled);
  }, []);

  return { send, setMicEnabled };
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

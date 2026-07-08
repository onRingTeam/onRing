import { useCallback, useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CaptionItem, ChatMessageRequest, ChatMessageResponse } from '@/types/meeting';
import { fromBackendLang, toBackendLang } from '@/types/meeting';
import { useElapsed } from '@/hooks/use-elapsed';
import { useMeetingStore, useSettingsStore } from '@/store';
import { MeetingSocket } from '@/lib/websocket';
import { MeshVoiceCall } from '@/lib/webrtc/mesh-voice-call';
import { LiveStt } from '@/lib/stt/live-stt';
import { speakMessage, stopSpeaking } from '@/lib/tts';
import { fetchActiveMeetingId, endMeeting as endMeetingApi, fetchMessages } from './api';


/**
 * 음성통화 권한 요청 (iOS는 getUserMedia 시 네이티브 팝업 자동).
 * - RECORD_AUDIO: 필수 — 거부 시 음성 불가.
 * - BLUETOOTH_CONNECT(Android 12+): 블루투스 이어폰 라우팅용 — 거부해도 통화는 가능.
 */
async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const mic = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: '마이크 권한',
    message: '회의 중 음성 대화를 위해 마이크 접근이 필요합니다.',
    buttonPositive: '허용',
    buttonNegative: '거부',
  });

  if (Platform.Version >= 31) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT).catch(() => null);
  }

  return mic === PermissionsAndroid.RESULTS.GRANTED;
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
export function useMeetingConnection(
  meetingId: number | null,
  senderId: number,
  senderName: string,
  /** 개설자가 회의를 종료했을 때(STOMP status 토픽 ENDED) 호출 — 화면 정리·이동용 */
  onMeetingEnded?: () => void,
) {
  const addCaption = useMeetingStore((s) => s.addCaption);
  const setParticipants = useMeetingStore((s) => s.setParticipants);
  const myLanguage = useSettingsStore((s) => s.myLanguage);
  const socketRef = useRef<MeetingSocket | null>(null);
  const meshRef = useRef<MeshVoiceCall | null>(null);
  const sttRef = useRef<LiveStt | null>(null);
  // 콜백 최신값 참조 (effect 재실행 없이) — 렌더마다 바뀌는 함수 identity 로 재연결되는 것 방지
  const onMeetingEndedRef = useRef(onMeetingEnded);
  onMeetingEndedRef.current = onMeetingEnded;
  // 마지막으로 수신한 채팅의 서버 시각 — 재연결 시 이 시각 이후 놓친 메시지 복구 기준
  const lastSentAtRef = useRef<string | null>(null);
  // 세션 고유 peerId (Mesh 시그널링 식별자)
  const peerIdRef = useRef<string>(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (meetingId === null) return;

    const socket = new MeetingSocket();
    const mesh = new MeshVoiceCall({
      peerId: peerIdRef.current,
      sendSignal: (msg) => socket.sendSignal(msg),
    });
    // 내 발화 라이브 STT → 확정 문장을 채팅(자막) 채널로 발행 (설계 §2: 자기 마이크만 STT)
    // source: STT — 수신 측이 TTS 재생에서 제외 (이미 WebRTC 음성으로 들림)
    const stt = new LiveStt({
      lang: myLanguage,
      onFinal: (text) =>
        socket.send({ senderId, senderName, message: text, lang: toBackendLang(myLanguage), source: 'STT' }),
    });

    socket.connect(meetingId, {
      joinName: senderName,
      onMessage: (msg) => {
        lastSentAtRef.current = msg.sentAt;
        addCaption(toCaption(msg));
        // 타이핑 채팅(CHAT)만 TTS 로 읽어준다 — STT 발화는 WebRTC 음성으로 이미 들렸고, 본인 메시지 제외
        if (msg.source !== 'STT' && msg.senderName !== senderName) {
          speakMessage(msg.message, msg.lang);
        }
      },
      onParticipants: (list) => setParticipants(list),
      onSignal: (msg) => void mesh.handleSignal(msg),
      onStatus: (event) => {
        if (event.type === 'ENDED') onMeetingEndedRef.current?.();
      },
      onConnect: async () => {
        // 끊김 동안 놓친 채팅 복구 (서버 인메모리 버퍼, 시간순). 중복은 store 에서 id 로 걸러짐.
        void fetchMessages(meetingId, lastSentAtRef.current ?? undefined)
          .then((missed) => {
            for (const m of missed) {
              lastSentAtRef.current = m.spokenAt;
              addCaption(toCaption({ senderId: m.userId, senderName: m.speakerName, message: m.original, lang: null, sentAt: m.spokenAt }));
            }
          })
          .catch((e) => console.warn('[chat] 놓친 메시지 복구 실패', e));

        // 끊긴 사이 개설자가 종료해 STOMP 종료(status) 이벤트를 놓쳤을 수 있으니 재확인.
        // 내 진행중 회의가 이 회의가 아니면(=종료됨) 로컬 종료 처리. 조회 실패 시엔 오탐 방지로 무시.
        void fetchActiveMeetingId()
          .then((activeId) => {
            if (activeId !== meetingId) onMeetingEndedRef.current?.();
          })
          .catch((e) => console.warn('[meeting] 종료 여부 재확인 실패', e));

        // 회의 입장 시 음성통화(WebRTC) + 내 발화 STT 자동 시작. 마이크 권한 필요.
        if (await ensureMicPermission()) {
          await mesh.start().catch((e) => console.warn('[voice] start 실패', e));
          await stt.start().catch((e) => console.warn('[stt] start 실패', e));
        } else {
          console.warn('[voice] 마이크 권한 거부됨');
        }
      },
    });
    socketRef.current = socket;
    meshRef.current = mesh;
    sttRef.current = stt;

    return () => {
      stt.stop();
      stopSpeaking();
      mesh.stop();
      socket.disconnect();
      socketRef.current = null;
      meshRef.current = null;
      sttRef.current = null;
    };
  }, [meetingId, senderId, senderName, myLanguage, addCaption, setParticipants]);

  const send = useCallback((payload: ChatMessageRequest) => {
    socketRef.current?.send(payload);
  }, []);

  /** 마이크 on/off — WebRTC 송신 트랙 + 내 발화 STT 를 함께 토글 */
  const setMicEnabled = useCallback((enabled: boolean) => {
    meshRef.current?.setMicEnabled(enabled);
    if (enabled) void sttRef.current?.start();
    else sttRef.current?.stop();
  }, []);

  /** 스피커폰 on/off (off = 수화부/이어폰) */
  const setSpeakerEnabled = useCallback((enabled: boolean) => {
    meshRef.current?.setSpeakerEnabled(enabled);
  }, []);

  return { send, setMicEnabled, setSpeakerEnabled };
}

/**
 * 회의 종료 뮤테이션. 성공 시 홈의 진행중/최근 회의 캐시를 무효화해
 * "진행 중 회의" confirm 이 더 이상 뜨지 않도록 한다. (화면정의서 5-a-1)
 */
export function useEndMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: number) => endMeetingApi(meetingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-meeting'] });
      qc.invalidateQueries({ queryKey: ['recent-meetings'] });
      qc.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
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

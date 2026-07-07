import { Client, type StompSubscription } from '@stomp/stompjs';

import type {
  ChatMessageRequest,
  ChatMessageResponse,
  MeetingStatusEvent,
  ParticipantListResponse,
  SignalMessage,
} from '@/types/meeting';
import { WS_URL } from '@/lib/config';

/**
 * 회의 실시간 통신용 STOMP over WebSocket 클라이언트.
 *
 * 연결 1개로 네 토픽을 구독한다 (STOMP 멀티플렉싱):
 * - 채팅:     발행 `/app/meetings/{id}/send`               → 구독 `/topic/meetings/{id}`
 * - presence: 발행 `/app/meetings/{id}/participants/join`   → 구독 `/topic/meetings/{id}/participants`
 * - 시그널링: 발행 `/app/meetings/{id}/signal`              → 구독 `/topic/meetings/{id}/signal` (WebRTC Mesh)
 * - 상태:     (서버 발행 전용)                               → 구독 `/topic/meetings/{id}/status` (회의 종료 알림)
 *
 * CONNECT 시 JWT 검증 (운영). dev/local 은 익명 허용.
 */

export interface MeetingSocketOptions {
  /** 채팅 메시지 수신 */
  onMessage: (msg: ChatMessageResponse) => void;
  /** 참여자 목록 변경 수신 */
  onParticipants?: (participants: string[]) => void;
  /** WebRTC 시그널 수신 (Mesh) */
  onSignal?: (msg: SignalMessage) => void;
  /** 회의 상태 변경 수신 — 개설자가 종료하면 type=ENDED 로 도착 */
  onStatus?: (event: MeetingStatusEvent) => void;
  /** 연결 직후 이 이름으로 입장(presence) 자동 발행 */
  joinName?: string;
  onConnect?: () => void;
  /** 운영 환경 CONNECT 인증용 JWT (dev/local 은 생략 가능). */
  token?: string;
}

/** 오프라인 발신 큐 상한 (초과 시 오래된 것부터 폐기). */
const MAX_PENDING_SENDS = 50;

export class MeetingSocket {
  private client: Client | null = null;
  private chatSub: StompSubscription | null = null;
  private presenceSub: StompSubscription | null = null;
  private signalSub: StompSubscription | null = null;
  private statusSub: StompSubscription | null = null;
  private meetingId: number | null = null;
  /** 연결 끊김 동안 보낸 채팅 — 재연결 시 순서대로 발행. */
  private pendingSends: ChatMessageRequest[] = [];

  /** 회의 ID로 STOMP 연결 + 두 토픽 구독 */
  public connect(meetingId: number, options: MeetingSocketOptions): void {
    if (this.client) return; // 중복 연결 방지
    this.meetingId = meetingId;

    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: options.token ? { Authorization: `Bearer ${options.token}` } : {},
      reconnectDelay: 5000,
      // RN Android WebSocket 이 발신 텍스트 프레임의 STOMP NULL(\0) 종결자를 누락시켜
      // 서버가 프레임을 인식하지 못함 → 바이너리 프레임 강제로 우회 (stompjs RN 권장 설정)
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      onConnect: () => {
        // 1) 채팅 토픽
        this.chatSub = client.subscribe(`/topic/meetings/${meetingId}`, (frame) => {
          const msg = parse<ChatMessageResponse>(frame.body);
          if (msg) options.onMessage(msg);
        });

        // 2) 참여자 presence 토픽
        this.presenceSub = client.subscribe(
          `/topic/meetings/${meetingId}/participants`,
          (frame) => {
            const res = parse<ParticipantListResponse>(frame.body);
            if (res) options.onParticipants?.(res.participants);
          },
        );

        // 3) WebRTC 시그널링 토픽 (Mesh)
        this.signalSub = client.subscribe(`/topic/meetings/${meetingId}/signal`, (frame) => {
          const msg = parse<SignalMessage>(frame.body);
          if (msg) options.onSignal?.(msg);
        });

        // 4) 회의 상태 토픽 (종료 알림)
        this.statusSub = client.subscribe(`/topic/meetings/${meetingId}/status`, (frame) => {
          const event = parse<MeetingStatusEvent>(frame.body);
          if (event) options.onStatus?.(event);
        });

        // 5) 입장 발행 (presence 등록)
        if (options.joinName) {
          client.publish({
            destination: `/app/meetings/${meetingId}/participants/join`,
            body: JSON.stringify({ senderName: options.joinName }),
          });
        }

        // 6) 끊김 동안 쌓인 발신 채팅 재전송
        const pending = this.pendingSends;
        this.pendingSends = [];
        for (const payload of pending) this.send(payload);

        options.onConnect?.();
      },
      onStompError: (frame) => {
        console.warn('[MeetingSocket] STOMP error', frame.headers['message'], frame.body);
      },
      onWebSocketError: (e) => {
        console.warn('[MeetingSocket] WebSocket error', (e as { message?: string })?.message ?? e);
      },
      onWebSocketClose: (e) => {
        console.warn('[MeetingSocket] WebSocket closed', e?.code, e?.reason);
      },
      debug: __DEV__ ? (m) => console.log('[MeetingSocket:debug]', m) : undefined,
    });

    client.activate();
    this.client = client;
  }

  /** 채팅 메시지 발행 (`/app/meetings/{id}/send`). 미연결 시 큐에 담아 재연결 후 발행. */
  public send(payload: ChatMessageRequest): void {
    if (this.meetingId === null) return;
    if (!this.client?.connected) {
      this.pendingSends.push(payload);
      if (this.pendingSends.length > MAX_PENDING_SENDS) this.pendingSends.shift();
      return;
    }
    this.client.publish({
      destination: `/app/meetings/${this.meetingId}/send`,
      body: JSON.stringify(payload),
    });
  }

  /** WebRTC 시그널 발행 (`/app/meetings/{id}/signal`) */
  public sendSignal(message: SignalMessage): void {
    if (!this.client?.connected || this.meetingId === null) return;
    this.client.publish({
      destination: `/app/meetings/${this.meetingId}/signal`,
      body: JSON.stringify(message),
    });
  }

  /** 구독 해제 및 연결 종료 (서버는 disconnect 이벤트로 presence 자동 정리) */
  public disconnect(): void {
    this.chatSub?.unsubscribe();
    this.presenceSub?.unsubscribe();
    this.signalSub?.unsubscribe();
    this.statusSub?.unsubscribe();
    this.chatSub = null;
    this.presenceSub = null;
    this.signalSub = null;
    this.statusSub = null;
    void this.client?.deactivate();
    this.client = null;
    this.meetingId = null;
  }
}

function parse<T>(body: string): T | null {
  try {
    return JSON.parse(body) as T;
  } catch (e) {
    console.warn('[MeetingSocket] parse error', e);
    return null;
  }
}

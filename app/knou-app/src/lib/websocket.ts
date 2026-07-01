import { Client, type StompSubscription } from '@stomp/stompjs';

import type {
  ChatMessageRequest,
  ChatMessageResponse,
  ParticipantListResponse,
} from '@/types/meeting';

/**
 * 회의 실시간 통신용 STOMP over WebSocket 클라이언트.
 *
 * 연결 1개로 두 토픽을 구독한다 (STOMP 멀티플렉싱):
 * - 채팅:     발행 `/app/meetings/{id}/send`               → 구독 `/topic/meetings/{id}`
 * - presence: 발행 `/app/meetings/{id}/participants/join`   → 구독 `/topic/meetings/{id}/participants`
 *
 * CONNECT 시 JWT 검증 (운영). dev/local 은 익명 허용.
 */

// TODO: 환경별 분기 필요 시 env(EXPO_PUBLIC_WS_URL)로 분리.
const WS_URL = 'wss://devknou.shinlabs.app/ws';

export interface MeetingSocketOptions {
  /** 채팅 메시지 수신 */
  onMessage: (msg: ChatMessageResponse) => void;
  /** 참여자 목록 변경 수신 */
  onParticipants?: (participants: string[]) => void;
  /** 연결 직후 이 이름으로 입장(presence) 자동 발행 */
  joinName?: string;
  onConnect?: () => void;
  /** 운영 환경 CONNECT 인증용 JWT (dev/local 은 생략 가능). */
  token?: string;
}

export class MeetingSocket {
  private client: Client | null = null;
  private chatSub: StompSubscription | null = null;
  private presenceSub: StompSubscription | null = null;
  private meetingId: number | null = null;

  /** 회의 ID로 STOMP 연결 + 두 토픽 구독 */
  public connect(meetingId: number, options: MeetingSocketOptions): void {
    if (this.client) return; // 중복 연결 방지
    this.meetingId = meetingId;

    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: options.token ? { Authorization: `Bearer ${options.token}` } : {},
      reconnectDelay: 5000,
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

        // 3) 입장 발행 (presence 등록)
        if (options.joinName) {
          client.publish({
            destination: `/app/meetings/${meetingId}/participants/join`,
            body: JSON.stringify({ senderName: options.joinName }),
          });
        }

        options.onConnect?.();
      },
      onStompError: (frame) => {
        console.warn('[MeetingSocket] STOMP error', frame.headers['message'], frame.body);
      },
      onWebSocketError: (e) => {
        console.warn('[MeetingSocket] WebSocket error', e);
      },
    });

    client.activate();
    this.client = client;
  }

  /** 채팅 메시지 발행 (`/app/meetings/{id}/send`) */
  public send(payload: ChatMessageRequest): void {
    if (!this.client?.connected || this.meetingId === null) return;
    this.client.publish({
      destination: `/app/meetings/${this.meetingId}/send`,
      body: JSON.stringify(payload),
    });
  }

  /** 구독 해제 및 연결 종료 (서버는 disconnect 이벤트로 presence 자동 정리) */
  public disconnect(): void {
    this.chatSub?.unsubscribe();
    this.presenceSub?.unsubscribe();
    this.chatSub = null;
    this.presenceSub = null;
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

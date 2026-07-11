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

    const base = `/topic/meetings/${meetingId}`;
    const client = new Client({
      // RN 전용 STOMP 처리:
      // - 발신: RN Android WebSocket 은 텍스트 프레임의 STOMP NULL 종결자를 누락 → 서버가
      //   CONNECT/SUBSCRIBE/SEND 를 무한 대기. forceBinaryWSFrames 로 이진 전송해 NULL 보존.
      // - 수신: forceBinary 구성에서 stompjs 의 수신 파서가 MESSAGE 프레임을 구독 콜백으로
      //   전달하지 못한다(연결 CONNECTED 는 처리되나 이후 MESSAGE 미전달; raw 바이트론 정상
      //   도착 확인됨). → 아래 webSocketFactory 에서 수신 프레임을 직접 파싱해 라우팅한다.
      webSocketFactory: () => {
        const ws = new WebSocket(WS_URL);
        // WS 메시지 경계와 STOMP 프레임 경계는 일치하지 않는다(프레임이 쪼개지거나 여러 개가
        // 뭉쳐 올 수 있음, 특히 Cloudflare 경유). NULL(\0) 종결자 기준으로 버퍼에서 완결 프레임만
        // 추출하고, 미완성 잔여분은 다음 메시지까지 버퍼에 남긴다.
        let buffer = '';
        ws.addEventListener('message', (e: { data: unknown }) => {
          if (typeof e.data !== 'string') return; // 서버는 텍스트 STOMP 프레임 전송
          buffer += e.data;
          let idx: number;
          while ((idx = buffer.indexOf('\0')) !== -1) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            const f = parseStompFrame(raw);
            if (!f || f.command !== 'MESSAGE') continue;
            const dest = f.headers.destination ?? '';
            if (dest === base) {
              const msg = parse<ChatMessageResponse>(f.body);
              if (msg) options.onMessage(msg);
            } else if (dest === `${base}/participants`) {
              const res = parse<ParticipantListResponse>(f.body);
              if (res) options.onParticipants?.(res.participants);
            } else if (dest === `${base}/signal`) {
              const m = parse<SignalMessage>(f.body);
              if (m) options.onSignal?.(m);
            } else if (dest === `${base}/status`) {
              const ev = parse<MeetingStatusEvent>(f.body);
              if (ev) options.onStatus?.(ev);
            }
          }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ws as any;
      },
      forceBinaryWSFrames: true,
      connectHeaders: options.token ? { Authorization: `Bearer ${options.token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        // 네 토픽을 구독한다 — SUBSCRIBE 프레임을 보내 서버가 이 세션에 브로드캐스트하도록 등록만
        // 하고, 실제 수신 처리는 webSocketFactory 의 직접 파서가 담당한다(콜백은 no-op).
        // (RN+forceBinary 에서 stompjs 수신 콜백이 동작 안 하므로 중복 전달 위험 없음)
        const noop = () => {};
        this.chatSub = client.subscribe(`/topic/meetings/${meetingId}`, noop);
        this.presenceSub = client.subscribe(`/topic/meetings/${meetingId}/participants`, noop);
        this.signalSub = client.subscribe(`/topic/meetings/${meetingId}/signal`, noop);
        this.statusSub = client.subscribe(`/topic/meetings/${meetingId}/status`, noop);

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

interface StompFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

/**
 * NULL 종결자 없이 잘라낸 STOMP 프레임 원문(raw) 하나를 파싱한다.
 * 앞쪽 하트비트(\n)를 제거하고, 비었으면(하트비트/PING) null 을 반환한다.
 * (stompjs 의 수신 파서가 RN 구성에서 MESSAGE 를 구독 콜백으로 전달 못 해 직접 파싱해 우회.)
 */
function parseStompFrame(raw: string): StompFrame | null {
  const part = raw.replace(/^\n+/, ''); // 앞쪽 하트비트(\n) 제거
  if (!part) return null;
  const sep = part.indexOf('\n\n');
  const head = sep >= 0 ? part.slice(0, sep) : part;
  const body = sep >= 0 ? part.slice(sep + 2) : '';
  const lines = head.split('\n');
  const command = lines[0];
  if (!command) return null;
  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    const idx = lines[i].indexOf(':');
    if (idx > 0) headers[lines[i].slice(0, idx)] = lines[i].slice(idx + 1);
  }
  return { command, headers, body };
}

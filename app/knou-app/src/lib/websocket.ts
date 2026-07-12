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
 * ⚠️ 왜 @stomp/stompjs 를 쓰지 않고 STOMP 프로토콜을 직접 구현하나:
 *   RN(Android) 의 WebSocket + stompjs 조합이 불안정하다.
 *   - 발신: RN 은 텍스트 프레임 끝의 STOMP NULL(\0) 종결자를 누락 → 서버가 프레임을 무한 대기.
 *   - 수신: stompjs 의 수신 파서가 이 구성에서 MESSAGE 프레임을 구독 콜백으로 전달하지 못한다.
 *   raw WebSocket 으로 STOMP 프레임을 직접 만들어(바이너리 전송으로 NULL 보존) 주고받으면
 *   서버와 정상 통신됨(배포 wss 에 대해 CONNECT/SUBSCRIBE/SEND/broadcast 전부 검증 완료).
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
/** 연결 끊김 시 재연결 간격(ms). */
const RECONNECT_DELAY = 5000;
/** STOMP heart-beat 간격(ms) — 서버 설정과 맞춘다. 유휴 프록시(Cloudflare) 강제 종료 방지. */
const HEARTBEAT_MS = 10_000;

/** 문자열 STOMP 프레임을 UTF-8 바이트로 (RN 텍스트 프레임 NULL 누락 회피 → 바이너리 전송). */
const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
function toBytes(s: string): Uint8Array {
  if (encoder) return encoder.encode(s);
  // 폴백(구형 런타임): UTF-8 수동 인코딩
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c >= 0xd800 && c <= 0xdbff) {
      c = 0x10000 + ((c & 0x3ff) << 10) + (s.charCodeAt(++i) & 0x3ff);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return Uint8Array.from(out);
}

/** STOMP 프레임 문자열 조립 (헤더 뒤 빈 줄 + 본문 + NULL 종결자). */
function buildFrame(command: string, headers: Record<string, string>, body = ''): string {
  const h = Object.entries(headers)
    .map(([k, v]) => `${k}:${v}`)
    .join('\n');
  return `${command}\n${h}\n\n${body}\0`;
}

/** WS_URL 에서 STOMP CONNECT host 헤더 값 추출 (wss://host:port/ws → host). */
function hostFromWsUrl(url: string): string {
  return url.replace(/^wss?:\/\//, '').split('/')[0].split(':')[0];
}

export class MeetingSocket {
  private ws: WebSocket | null = null;
  private meetingId: number | null = null;
  private options: MeetingSocketOptions | null = null;
  /** CONNECTED 프레임 수신 여부(=발행 가능 상태). */
  private connected = false;
  /** disconnect() 로 의도적으로 닫혔는지 — true 면 재연결하지 않는다. */
  private closed = false;
  /** 수신 프레임 조립용 버퍼(WS 메시지 경계 ≠ STOMP 프레임 경계). */
  private rxBuffer = '';
  /** 연결 끊김 동안 보낸 채팅 — 재연결 시 순서대로 발행. */
  private pendingSends: ChatMessageRequest[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** 회의 ID로 STOMP 연결 + 네 토픽 구독 */
  public connect(meetingId: number, options: MeetingSocketOptions): void {
    if (this.ws) return; // 중복 연결 방지
    this.meetingId = meetingId;
    this.options = options;
    this.closed = false;
    this.open();
  }

  /** 실제 소켓 오픈 (초기 연결/재연결 공용). */
  private open(): void {
    if (this.meetingId === null || this.options === null) return;
    this.connected = false;
    this.rxBuffer = '';

    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.addEventListener('open', () => {
      // STOMP CONNECT — 운영은 Authorization 헤더로 JWT 검증(dev/local 익명 허용).
      const headers: Record<string, string> = {
        'accept-version': '1.2',
        host: hostFromWsUrl(WS_URL),
        'heart-beat': `${HEARTBEAT_MS},${HEARTBEAT_MS}`,
      };
      if (this.options?.token) headers['Authorization'] = `Bearer ${this.options.token}`;
      this.raw(buildFrame('CONNECT', headers));
    });

    ws.addEventListener('message', (e: { data: unknown }) => {
      if (typeof e.data !== 'string') return; // 서버는 텍스트 STOMP 프레임 전송
      this.rxBuffer += e.data;
      let idx: number;
      while ((idx = this.rxBuffer.indexOf('\0')) !== -1) {
        const raw = this.rxBuffer.slice(0, idx);
        this.rxBuffer = this.rxBuffer.slice(idx + 1);
        const f = parseStompFrame(raw);
        if (!f) continue; // 하트비트(\n)/빈 프레임
        if (f.command === 'CONNECTED') this.onConnected();
        else if (f.command === 'MESSAGE') this.route(f);
        else if (f.command === 'ERROR') console.warn('[MeetingSocket] STOMP ERROR', f.headers['message'], f.body);
      }
    });

    ws.addEventListener('error', (e: unknown) => {
      console.warn('[MeetingSocket] WebSocket error', (e as { message?: string })?.message ?? 'error');
    });

    ws.addEventListener('close', (e: { code?: number; reason?: string }) => {
      console.warn('[MeetingSocket] WebSocket closed', e?.code, e?.reason);
      this.connected = false;
      this.clearHeartbeat();
      this.ws = null;
      if (!this.closed) this.scheduleReconnect();
    });
  }

  /** CONNECTED 수신 후: 구독 + 입장 발행 + 대기중 발신 flush + heartbeat 시작. */
  private onConnected(): void {
    if (this.meetingId === null) return;
    this.connected = true;
    const base = `/topic/meetings/${this.meetingId}`;
    this.raw(buildFrame('SUBSCRIBE', { id: 'sub-chat', destination: base }));
    this.raw(buildFrame('SUBSCRIBE', { id: 'sub-presence', destination: `${base}/participants` }));
    this.raw(buildFrame('SUBSCRIBE', { id: 'sub-signal', destination: `${base}/signal` }));
    this.raw(buildFrame('SUBSCRIBE', { id: 'sub-status', destination: `${base}/status` }));

    // 입장 발행 (presence 등록)
    if (this.options?.joinName) {
      this.publish(`/app/meetings/${this.meetingId}/participants/join`, JSON.stringify({ senderName: this.options.joinName }));
    }

    // 끊김 동안 쌓인 발신 채팅 재전송
    const pending = this.pendingSends;
    this.pendingSends = [];
    for (const payload of pending) this.send(payload);

    this.startHeartbeat();
    this.options?.onConnect?.();
  }

  /** MESSAGE 프레임을 destination 기준으로 콜백에 라우팅. */
  private route(f: StompFrame): void {
    if (this.meetingId === null || !this.options) return;
    const base = `/topic/meetings/${this.meetingId}`;
    const dest = f.headers.destination ?? '';
    if (dest === base) {
      const msg = parse<ChatMessageResponse>(f.body);
      if (msg) this.options.onMessage(msg);
    } else if (dest === `${base}/participants`) {
      const res = parse<ParticipantListResponse>(f.body);
      if (res) this.options.onParticipants?.(res.participants);
    } else if (dest === `${base}/signal`) {
      const m = parse<SignalMessage>(f.body);
      if (m) this.options.onSignal?.(m);
    } else if (dest === `${base}/status`) {
      const ev = parse<MeetingStatusEvent>(f.body);
      if (ev) this.options.onStatus?.(ev);
    }
  }

  /** 채팅 메시지 발행 (`/app/meetings/{id}/send`). 미연결 시 큐에 담아 재연결 후 발행. */
  public send(payload: ChatMessageRequest): void {
    if (this.meetingId === null) return;
    if (!this.connected) {
      this.pendingSends.push(payload);
      if (this.pendingSends.length > MAX_PENDING_SENDS) this.pendingSends.shift();
      return;
    }
    this.publish(`/app/meetings/${this.meetingId}/send`, JSON.stringify(payload));
  }

  /** WebRTC 시그널 발행 (`/app/meetings/{id}/signal`) */
  public sendSignal(message: SignalMessage): void {
    if (!this.connected || this.meetingId === null) return;
    this.publish(`/app/meetings/${this.meetingId}/signal`, JSON.stringify(message));
  }

  /** SEND 프레임 발행. */
  private publish(destination: string, body: string): void {
    this.raw(buildFrame('SEND', { destination, 'content-type': 'application/json' }, body));
  }

  /** 프레임 문자열을 바이너리로 전송(NULL 보존). */
  private raw(frame: string): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.ws?.send(toBytes(frame) as any);
    } catch (e) {
      console.warn('[MeetingSocket] send 실패', e);
    }
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    // 클라이언트 → 서버 하트비트(단독 \n). 유휴로 인한 프록시 강제 종료 방지.
    this.heartbeatTimer = setInterval(() => {
      try {
        this.ws?.send('\n');
      } catch {
        /* 전송 실패는 close 이벤트가 처리 */
      }
    }, HEARTBEAT_MS);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.closed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closed) this.open();
    }, RECONNECT_DELAY);
  }

  /** 연결 종료 (서버는 disconnect 이벤트로 presence 자동 정리) */
  public disconnect(): void {
    this.closed = true;
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.raw(buildFrame('DISCONNECT', {}));
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
    this.ws = null;
    this.connected = false;
    this.meetingId = null;
    this.options = null;
    this.pendingSends = [];
    this.rxBuffer = '';
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

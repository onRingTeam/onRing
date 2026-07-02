export type LangCode = 'ko' | 'en' | 'ja' | 'zh';

/** 백엔드 `Language` enum과 1:1 (KO | JA | ZH | EN). */
export type BackendLang = 'KO' | 'JA' | 'ZH' | 'EN';

const LANG_TO_BACKEND: Record<LangCode, BackendLang> = { ko: 'KO', ja: 'JA', zh: 'ZH', en: 'EN' };
const BACKEND_TO_LANG: Record<BackendLang, LangCode> = { KO: 'ko', JA: 'ja', ZH: 'zh', EN: 'en' };

export const toBackendLang = (code: LangCode): BackendLang => LANG_TO_BACKEND[code];
export const fromBackendLang = (lang: BackendLang | null | undefined): LangCode =>
  lang ? BACKEND_TO_LANG[lang] : 'ko';

/**
 * STOMP 채팅 메시지 계약 — 백엔드 `MessageDto.kt`와 반드시 동일 형태.
 * 앱·웹·서버가 공유하는 단일 계약(contract).
 */

/** 클라이언트 → 서버 발행 (`/app/meetings/{id}/send`). */
export interface ChatMessageRequest {
  senderName: string;
  message: string;
  lang?: BackendLang | null;
}

/** 서버 → 구독자 브로드캐스트 (`/topic/meetings/{id}`). */
export interface ChatMessageResponse {
  senderName: string;
  message: string;
  lang: BackendLang | null;
  /** ISO LocalDateTime 문자열 (예: "2026-06-26T14:05:12") */
  sentAt: string;
}

/**
 * 참여자 presence 계약 (두 번째 토픽) — 백엔드 `ParticipantDto.kt`와 동일.
 */

/** 클라이언트 → 서버: 입장 (`/app/meetings/{id}/participants/join`). */
export interface ParticipantJoinRequest {
  senderName: string;
}

/** 서버 → 구독자: 현재 참여자 이름 목록 (`/topic/meetings/{id}/participants`). */
export interface ParticipantListResponse {
  participants: string[];
}

/**
 * WebRTC Mesh 시그널링 계약 (세 번째 토픽) — 백엔드 `SignalDto.kt`와 일치.
 * 서버는 단순 릴레이, P2P 협상은 클라이언트가 담당.
 * 발행 `/app/meetings/{id}/signal` · 구독 `/topic/meetings/{id}/signal`.
 */
export type SignalType = 'join' | 'offer' | 'answer' | 'candidate' | 'leave';

export interface SignalMessage {
  type: SignalType;
  /** 발신 peerId */
  from: string;
  /** 수신 peerId (null = 방 전체) */
  to?: string | null;
  /** SDP/ICE 등 직렬화(JSON string)된 페이로드 */
  payload?: string | null;
}

export interface Speaker {
  id: string;
  name: string;
  language: LangCode;
}

export interface CaptionItem {
  id: string;
  speaker: Speaker;
  /** 화자가 말한 원문 */
  text: string;
  /** 내 언어로 번역된 문장 (없으면 원문만 표시) */
  translation?: string;
  timestamp: number;
}

export type MeetingStatus = 'IN_PROGRESS' | 'ENDED';

/** 회의 생성/참여 결과 (회의실 진입 정보) — 백엔드 `MeetingRoomResponse`와 일치. */
export interface MeetingRoomResponse {
  meetingId: number;
  title: string;
  meetingCode: string;
  status: MeetingStatus;
  /** 개설자 여부 (true면 종료 버튼 노출) */
  host: boolean;
}

export interface MeetingRecord {
  id: string;
  title: string;
  code: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds: number;
  speakers: Speaker[];
  captions: CaptionItem[];
  summary?: string;
  language: LangCode;
}

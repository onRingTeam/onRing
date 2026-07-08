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

/**
 * 메시지 출처 — 수신 측 TTS 재생 판단용.
 * CHAT(직접 타이핑) 만 TTS 재생, STT(음성 자동 변환)는 이미 WebRTC 로 들렸으므로 제외.
 */
export type MessageSource = 'CHAT' | 'STT';

/** 클라이언트 → 서버 발행 (`/app/meetings/{id}/send`). */
export interface ChatMessageRequest {
  /** 발화자 회원 ID (종료 후 요약 정합성 기준). */
  senderId: number;
  senderName: string;
  message: string;
  lang?: BackendLang | null;
  /** 생략 시 서버 기본 CHAT */
  source?: MessageSource;
}

/** 서버 → 구독자 브로드캐스트 (`/topic/meetings/{id}`). */
export interface ChatMessageResponse {
  senderId: number;
  senderName: string;
  message: string;
  lang: BackendLang | null;
  /** ISO LocalDateTime 문자열 (예: "2026-06-26T14:05:12") */
  sentAt: string;
  source?: MessageSource;
}

/**
 * 회의 상태 변경 브로드캐스트 (`/topic/meetings/{id}/status`) — 백엔드 `MeetingStatusEvent`와 일치.
 * 개설자가 종료하면 type=ENDED 로 발행되며, 수신한 참여자는 회의 화면을 정리한다.
 */
export interface MeetingStatusEvent {
  type: 'ENDED';
  meetingId: number;
  /** ISO LocalDateTime 문자열 */
  occurredAt: string;
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

/**
 * 회의록 목록 카드 — 백엔드 `MeetingListItemResponse`와 1:1 (camelCase).
 * (화면정의서 2-d, 3-d)
 */
export interface MeetingListItem {
  meetingId: number;
  title: string;
  favorite: boolean;
  /** ISO LocalDateTime 문자열 (예: "2026-06-26T14:00:00") */
  meetingDate: string;
  durationSec: number | null;
  participantNames: string[];
  languages: BackendLang[];
  summary: string | null;
  status: MeetingStatus;
}

/** 화자별 발화 통계 — 백엔드 `SpeakerStatResponse`와 1:1. */
export interface SpeakerStat {
  userId: number;
  name: string;
  actionItem: string | null;
  speechCount: number;
  /** 발화 비율(%) */
  speechRatio: number;
}

/**
 * 상세회의 - AI 요약 — 백엔드 `MeetingDetailResponse`와 1:1.
 * (화면정의서 4-b, 4-c)
 */
export interface MeetingDetail {
  meetingId: number;
  title: string;
  meetingDate: string;
  participantCount: number;
  languageCount: number;
  durationSec: number | null;
  summary: string | null;
  speakers: SpeakerStat[];
}

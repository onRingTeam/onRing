package com.knou.api.websocket

import com.knou.api.dto.common.Language
import java.time.LocalDateTime

/**
 * 회의 실시간 채팅(화면 5) STOMP 메시지 DTO.
 *
 * ⚠️ 앱·웹이 공유하는 단일 계약(contract). 양쪽 클라이언트가 이 모양 그대로 직렬화/역직렬화해야 상호 통신됨.
 */

/** 메시지 출처 — 수신 측 TTS 재생 판단용 (STT 발(發)은 이미 WebRTC 음성으로 들렸으므로 TTS 제외). */
enum class MessageSource {
    /** 직접 타이핑한 채팅 → 수신 측에서 TTS 재생 */
    CHAT,

    /** STT 자동 변환 발화 → TTS 재생 안 함 */
    STT,
}

/** 클라이언트 → 서버 발행 (`/app/meetings/{id}/send`). */
data class MessageRequest(
    /** 발화자 회원 ID. 종료 후 요약(액션아이템·발화 수) 정합성의 기준. TODO Phase 6: 인증 도입 후 토큰의 userId로 대체(클라이언트 신뢰 X). */
    val senderId: Long,

    /** 발화자 표시명. */
    val senderName: String,

    /** 발화 내용. */
    val message: String,

    /** 발화 언어(원문). 추후 번역 기준. null 허용(테스트 단계). */
    val lang: Language? = null,

    /** 출처 (기본 CHAT — 구버전 클라이언트 호환). */
    val source: MessageSource = MessageSource.CHAT,
)

/** 서버 → 구독자 브로드캐스트 (`/topic/meetings/{id}`). */
data class MessageResponse(
    val senderId: Long,
    val senderName: String,
    val message: String,
    val lang: Language?,
    val sentAt: LocalDateTime,
    /** 출처 그대로 에코 — 수신 측 TTS 재생 판단용. */
    val source: MessageSource = MessageSource.CHAT,
    // TODO Phase 4-2: 수신자 언어로 번역된 결과(translatedText, targetLang) 추가
    // TODO Phase 6: messageId 추가(영속화 후)
)

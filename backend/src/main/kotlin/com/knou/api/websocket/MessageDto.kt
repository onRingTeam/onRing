package com.knou.api.websocket

import com.knou.api.dto.common.Language
import java.time.LocalDateTime

/**
 * 회의 실시간 채팅(화면 5) STOMP 메시지 DTO.
 *
 * ⚠️ 앱·웹이 공유하는 단일 계약(contract). 양쪽 클라이언트가 이 모양 그대로 직렬화/역직렬화해야 상호 통신됨.
 */

/** 클라이언트 → 서버 발행 (`/app/meetings/{id}/send`). */
data class MessageRequest(
    /** 발화자 표시명. TODO Phase 6: 인증 도입 후 토큰의 userId로 대체(클라이언트 신뢰 X). */
    val senderName: String,

    /** 발화 내용. */
    val message: String,

    /** 발화 언어(원문). 추후 번역 기준. null 허용(테스트 단계). */
    val lang: Language? = null,
)

/** 서버 → 구독자 브로드캐스트 (`/topic/meetings/{id}`). */
data class MessageResponse(
    val senderName: String,
    val message: String,
    val lang: Language?,
    val sentAt: LocalDateTime,
    // TODO Phase 4-2: 수신자 언어로 번역된 결과(translatedText, targetLang) 추가
    // TODO Phase 6: messageId, senderId 추가(영속화 후)
)

package com.knou.api.websocket

import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.handler.annotation.SendTo
import org.springframework.stereotype.Controller
import java.time.LocalDateTime

/**
 * 회의 실시간 채팅(화면 5) STOMP 핸들러.
 *
 * 현재는 **단순 릴레이**: 받은 메시지를 같은 방 토픽으로 그대로 브로드캐스트한다.
 *
 * TODO Phase 6: CONNECT 인증된 Principal(userId)로 발화자 식별 (senderName 신뢰 X)
 * TODO Phase 6: MessageEntity 저장(영속화) → /api/meetings/{id}/messages 로 다시보기
 * TODO Phase 4-2: 수신자 언어별 번역 후 /user/queue 로 개인 전송 (현재는 원문 브로드캐스트)
 */
@Controller
class WebSocketController {

    /**
     * 클라이언트 발행: `/app/meetings/{meetingId}/send`
     * → 구독자 전송: `/topic/meetings/{meetingId}`
     */
    @MessageMapping("/meetings/{meetingId}/send")
    @SendTo("/topic/meetings/{meetingId}")
    fun send(
        @DestinationVariable meetingId: Long,
        @Payload request: MessageRequest,
    ): MessageResponse {
        return MessageResponse(
            senderName = request.senderName,
            message = request.message,
            lang = request.lang,
            sentAt = LocalDateTime.now(),
        )
    }
}
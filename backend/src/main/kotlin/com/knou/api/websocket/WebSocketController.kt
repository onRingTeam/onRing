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
 * 받은 메시지를 같은 방 토픽으로 브로드캐스트하고, 진행중 회의 동안만
 * [MeetingChatBuffer] 에 보관한다 (회의 종료 시 폐기).
 * 재연결한 클라이언트는 `GET /api/meetings/{id}/messages?after=` 로 놓친 메시지를 복구한다.
 *
 * TODO Phase 6: CONNECT 인증된 Principal(userId)로 발화자 식별 (senderName 신뢰 X)
 * TODO Phase 4-2: 수신자 언어별 번역 후 /user/queue 로 개인 전송 (현재는 원문 브로드캐스트)
 */
@Controller
class WebSocketController(
    private val chatBuffer: MeetingChatBuffer,
) {

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
        val sentAt = LocalDateTime.now()
        chatBuffer.append(meetingId, request.senderName, request.message, sentAt)

        return MessageResponse(
            senderName = request.senderName,
            message = request.message,
            lang = request.lang,
            sentAt = sentAt,
        )
    }
}

package com.knou.api.websocket

import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.handler.annotation.SendTo
import org.springframework.stereotype.Controller

/**
 * WebRTC Mesh 시그널링 릴레이 — 세 번째 STOMP 토픽.
 *
 * 받은 시그널을 같은 방 토픽으로 그대로 브로드캐스트한다(단순 릴레이).
 * 수신 클라이언트가 `to` 필드로 자기 대상 메시지만 처리한다.
 */
@Controller
class SignalController {

    /**
     * 발행: `/app/meetings/{meetingId}/signal`
     * → 구독: `/topic/meetings/{meetingId}/signal`
     */
    @MessageMapping("/meetings/{meetingId}/signal")
    @SendTo("/topic/meetings/{meetingId}/signal")
    fun signal(
        @DestinationVariable meetingId: Long,
        @Payload message: SignalMessage,
    ): SignalMessage = message
}

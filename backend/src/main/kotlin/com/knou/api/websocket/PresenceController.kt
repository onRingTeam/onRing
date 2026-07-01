package com.knou.api.websocket

import org.springframework.context.event.EventListener
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Controller
import org.springframework.web.socket.messaging.SessionDisconnectEvent

/**
 * 회의 방 참여자 presence STOMP 핸들러 — 채팅(WebSocketController)과 별개 토픽.
 *
 * - 입장: 클라이언트가 `/app/meetings/{id}/participants/join` 발행
 *   → 레지스트리 등록 후 `/topic/meetings/{id}/participants` 로 전체 목록 브로드캐스트
 * - 퇴장: STOMP 연결 종료(SessionDisconnectEvent) 감지 → 레지스트리에서 제거 후 재브로드캐스트
 */
@Controller
class PresenceController(
    private val messagingTemplate: SimpMessagingTemplate,
    private val presenceRegistry: PresenceRegistry,
) {

    @MessageMapping("/meetings/{meetingId}/participants/join")
    fun join(
        @DestinationVariable meetingId: Long,
        @Payload request: ParticipantJoinRequest,
        headerAccessor: SimpMessageHeaderAccessor,
    ) {
        val sessionId = headerAccessor.sessionId ?: return
        val participants = presenceRegistry.join(meetingId, sessionId, request.senderName)
        broadcast(meetingId, participants)
    }

    @EventListener
    fun onDisconnect(event: SessionDisconnectEvent) {
        val (meetingId, remaining) = presenceRegistry.leave(event.sessionId) ?: return
        broadcast(meetingId, remaining)
    }

    private fun broadcast(meetingId: Long, participants: List<String>) {
        messagingTemplate.convertAndSend(
            "/topic/meetings/$meetingId/participants",
            ParticipantListResponse(participants),
        )
    }
}

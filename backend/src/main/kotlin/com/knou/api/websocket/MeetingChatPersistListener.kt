package com.knou.api.websocket

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.knou.api.dto.meeting.MeetingMessageResponse
import com.knou.api.service.MeetingTranscriptService
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component

/**
 * 회의 종료 시 발행되는 [MeetingChatArchivedEvent] 를 받아 채팅 내역을 DB 로 영속화한다.
 *
 * 요약을 담당하는 [MeetingChatArchivedListener] 와 **별도** 리스너로 둔다.
 * Spring 이벤트는 멀티캐스트라 두 리스너가 각각 수신하며, 저장 실패가 요약 흐름에
 * (또는 그 반대로) 얽히지 않는다. 덕분에 Gemini 미설정·요약 실패와 무관하게 대화가 저장된다.
 *
 * 여기서 저장에 실패하면 대화는 유실된다(버퍼는 이미 폐기됨). 로그로만 추적한다 —
 * 요약과 동일한 기존 트레이드오프.
 */
@Component
class MeetingChatPersistListener(
    private val objectMapper: ObjectMapper,
    private val transcriptService: MeetingTranscriptService,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Async
    @EventListener
    fun onChatArchived(event: MeetingChatArchivedEvent) {
        try {
            val messages: List<MeetingMessageResponse> = objectMapper.readValue(event.messagesJson)
            transcriptService.saveTranscript(event.meetingId, messages)
        } catch (e: Exception) {
            log.error("[chat-persist] 회의 {} 대화 저장 실패 (채팅 {}건)", event.meetingId, event.messageCount, e)
        }
    }
}

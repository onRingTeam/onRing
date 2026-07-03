package com.knou.api.websocket

import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component

/**
 * 회의 종료 시 발행되는 [MeetingChatArchivedEvent] 수신 지점.
 *
 * 채팅 내역 전체(JSON)가 이벤트에 담겨 오며, 버퍼는 이미 폐기된 뒤이므로
 * 여기서 받지 않으면 내역은 유실된다.
 */
@Component
class MeetingChatArchivedListener {

    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * TODO: 회의 종료 후처리 구현 (담당자 구현 예정)
     *  - event.messagesJson: 시간순 `MeetingMessageResponse` 배열 JSON
     *    (messageId · speakerName · spokenAt · original · translated)
     *  - 예상 용도: AI 요약 생성, 회의록(meeting.summary) 저장, 발화 빈도 집계 등
     *  - 오래 걸리는 작업이면 @Async 유지 권장 (회의 종료 API 응답을 막지 않도록)
     */
    @Async
    @EventListener
    fun onChatArchived(event: MeetingChatArchivedEvent) {
        log.info(
            "[chat-archive] 회의 {} 종료 — 채팅 {}건 수신 (후처리 TODO)",
            event.meetingId,
            event.messageCount,
        )

        // TODO : 회의종료후 채팅 메세지 처리
        // event.messagesJson: 시간순 `MeetingMessageResponse` 배열 JSON
        // (messageId · speakerName · spokenAt · original · translated)
        // 현재는 메세지 최대 1000건 저장 중이며,
        // 변경 필요시 MeetingChatBuffer.kt
        // MAX_MESSAGES_PER_MEETING 상수 값 변경
    }
}

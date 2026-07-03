package com.knou.api.websocket

/**
 * 회의 종료로 인메모리 채팅 버퍼가 폐기되기 직전, 보관분 전체를 담아 발행되는 이벤트.
 *
 * 발행: [MeetingChatBuffer.clear] (채팅이 1건 이상일 때만)
 * 수신: [MeetingChatArchivedListener]
 */
data class MeetingChatArchivedEvent(
    val meetingId: Long,

    /** 보관돼 있던 메시지 수 */
    val messageCount: Int,

    /** 채팅 내역 전체 — `MeetingMessageResponse` 배열의 JSON 직렬화 (시간순) */
    val messagesJson: String,
)

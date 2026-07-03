package com.knou.api.websocket

import com.fasterxml.jackson.databind.ObjectMapper
import com.knou.api.dto.meeting.MeetingMessageResponse
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/** 회의당 최대 보관 메시지 수 (초과 시 오래된 것부터 폐기 — 메모리 상한). */
private const val MAX_MESSAGES_PER_MEETING = 1000

/**
 * 진행중 회의의 채팅 메시지 인메모리 버퍼.
 *
 * STOMP 브로드캐스트는 재전송이 없으므로, 재연결한 클라이언트가
 * `GET /api/meetings/{id}/messages?after=` 로 놓친 메시지를 복구할 때 사용한다.
 * DB 영속화 없이 회의가 종료되면 [clear] 로 통째로 버린다.
 *
 * 단일 인스턴스 전제 (SimpleBroker 와 동일). 다중 인스턴스 확장 시 Redis 등으로 전환.
 */
@Component
class MeetingChatBuffer(
    private val eventPublisher: ApplicationEventPublisher,
    private val objectMapper: ObjectMapper,
) {

    private val buffers = ConcurrentHashMap<Long, MutableList<MeetingMessageResponse>>()
    private val idSequence = AtomicLong(0)

    /** 메시지 보관. 부여된 messageId 를 포함한 완성 메시지를 반환한다. */
    fun append(meetingId: Long, senderName: String, message: String, sentAt: LocalDateTime): MeetingMessageResponse {
        val stored = MeetingMessageResponse(
            messageId = idSequence.incrementAndGet(),
            speakerName = senderName,
            spokenAt = sentAt,
            original = message,
            // TODO Phase 4-2: 조회자 언어로 번역 제공
            translated = null,
        )
        val list = buffers.computeIfAbsent(meetingId) { mutableListOf() }
        synchronized(list) {
            list.add(stored)
            if (list.size > MAX_MESSAGES_PER_MEETING) list.removeAt(0)
        }
        return stored
    }

    /** [after] 이후 메시지 조회 (시간순). 생략 시 보관분 전체. */
    fun since(meetingId: Long, after: LocalDateTime?): List<MeetingMessageResponse> {
        val list = buffers[meetingId] ?: return emptyList()
        synchronized(list) {
            return if (after != null) list.filter { it.spokenAt.isAfter(after) } else list.toList()
        }
    }

    /**
     * 회의 종료 시 버퍼 폐기.
     * 채팅이 1건 이상이면 전체 내역을 JSON 으로 변환해 [MeetingChatArchivedEvent] 를 발행한다
     * (회의록/요약 등 후처리는 [MeetingChatArchivedListener] 에서).
     */
    fun clear(meetingId: Long) {
        val messages = buffers.remove(meetingId) ?: return
        val snapshot = synchronized(messages) { messages.toList() }
        if (snapshot.isEmpty()) return

        eventPublisher.publishEvent(
            MeetingChatArchivedEvent(
                meetingId = meetingId,
                messageCount = snapshot.size,
                messagesJson = objectMapper.writeValueAsString(snapshot),
            ),
        )
    }
}

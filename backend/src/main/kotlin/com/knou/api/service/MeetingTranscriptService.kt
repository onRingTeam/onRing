package com.knou.api.service

import com.knou.api.dto.meeting.MeetingMessageResponse
import com.knou.api.entity.MeetingMessageEntity
import com.knou.api.repository.MeetingMessageRepository
import com.knou.api.repository.MeetingRepository
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

/**
 * 종료된 회의의 전체 대화(발화 기록) 저장·조회.
 *
 * 저장은 [com.knou.api.websocket.MeetingChatPersistListener] 가 회의 종료 이벤트에서 호출하고,
 * 조회는 상세회의 '전체 대화' 탭(GET /api/meetings/{id}/transcript)이 사용한다.
 * 요약([MeetingSummaryService]) 과 같은 층위의 회의 종료 후처리 서비스다.
 */
@Service
class MeetingTranscriptService(
    private val meetingRepository: MeetingRepository,
    private val messageRepository: MeetingMessageRepository,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * 회의 종료 시 채팅 내역 전체를 영속화한다. 요약 성공 여부와 무관하게 저장한다.
     * 종료 이벤트가 중복 전달돼도 재저장하지 않도록 멱등 처리한다(이미 있으면 skip).
     *
     * @throws ResponseStatusException 404(회의 없음)
     */
    @Transactional
    fun saveTranscript(meetingId: Long, messages: List<MeetingMessageResponse>) {
        val meeting = meetingRepository.findById(meetingId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "회의를 찾을 수 없습니다: $meetingId")
        }
        if (messageRepository.existsByMeeting_MeetingId(meetingId)) {
            log.warn("[chat-persist] 회의 {} — 이미 저장된 대화 존재, 재저장 생략", meetingId)
            return
        }
        val entities = messages.map { msg ->
            MeetingMessageEntity(
                meeting = meeting,
                userId = msg.userId,
                speakerName = msg.speakerName,
                spokenAt = msg.spokenAt,
                original = msg.original,
                translated = msg.translated,
                lang = msg.lang,
            )
        }
        messageRepository.saveAll(entities)
        log.info("[chat-persist] 회의 {} 대화 {}건 저장 완료", meetingId, entities.size)
    }

    /**
     * 종료된 회의의 전체 대화를 시간순으로 조회한다.
     * 진행중이거나 발화가 없던 회의는 빈 목록을 반환한다.
     *
     * @throws ResponseStatusException 404(회의 없음)
     */
    @Transactional(readOnly = true)
    fun transcript(meetingId: Long): List<MeetingMessageResponse> {
        if (!meetingRepository.existsById(meetingId)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "회의를 찾을 수 없습니다: $meetingId")
        }
        return messageRepository.findAllByMeeting_MeetingIdOrderBySpokenAtAscMessageIdAsc(meetingId)
            .map { entity ->
                MeetingMessageResponse(
                    messageId = entity.messageId!!,
                    userId = entity.userId,
                    speakerName = entity.speakerName,
                    spokenAt = entity.spokenAt,
                    original = entity.original,
                    translated = entity.translated,
                    lang = entity.lang,
                )
            }
    }
}

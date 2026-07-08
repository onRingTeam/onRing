package com.knou.api.service

import com.knou.api.client.AttendeeInfo
import com.knou.api.client.MeetingSummaryResult
import com.knou.api.dto.meeting.MeetingMessageResponse
import com.knou.api.repository.MeetingAttendanceRepository
import com.knou.api.repository.MeetingRepository
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

/** LLM 프롬프트에 넘길 회의 맥락 (회의명 + 참석자). */
data class MeetingContext(
    val title: String,
    val attendees: List<AttendeeInfo>,
)

/**
 * 회의 종료 후처리(요약) 저장 로직.
 *
 * LLM 호출(수 초)이 DB 커넥션/트랜잭션을 잡지 않도록 트랜잭션을 둘로 나눈다.
 * 오케스트레이션(TX1 → LLM → TX2)은 [com.knou.api.websocket.MeetingChatArchivedListener] 가 담당한다.
 * 발화자 정합성은 메시지의 userId 를 기준으로 참석자(attendance)와 매칭한다.
 */
@Service
class MeetingSummaryService(
    private val meetingRepository: MeetingRepository,
    private val attendanceRepository: MeetingAttendanceRepository,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * TX1: 발화 수 집계 저장. LLM 실패와 무관하게 먼저 확정한다.
     * 메시지의 userId 로 attendance 를 매칭해 speech_count 를 갱신하고,
     * 요약 프롬프트에 넘길 회의 맥락(회의명·참석자)을 반환한다.
     *
     * @throws ResponseStatusException 404(회의 없음)
     */
    @Transactional
    fun recordSpeechCounts(meetingId: Long, messages: List<MeetingMessageResponse>): MeetingContext {
        val meeting = meetingRepository.findById(meetingId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "회의를 찾을 수 없습니다: $meetingId")
        }
        val attendances = attendanceRepository.findAllByMeeting_MeetingId(meetingId)
        val byUserId = attendances.associateBy { it.user.userId }

        val counts = messages.groupingBy { it.userId }.eachCount()
        counts.forEach { (userId, count) ->
            val attendance = byUserId[userId]
            if (attendance == null) {
                log.warn("[chat-archive] 회의 {} — 참석 기록 없는 발화자 userId={} (발화 {}건 무시)", meetingId, userId, count)
            } else {
                attendance.speechCount = count
            }
        }

        val attendees = attendances.map { AttendeeInfo(it.user.userId!!, it.user.name) }
        return MeetingContext(title = meeting.title, attendees = attendees)
    }

    /**
     * TX2: LLM 결과 저장. meeting.summary 저장 + userId 로 매칭되는 참석자의 action_item 저장(참석자당 1건).
     * 참석자 목록에 없는 userId 는 무시하고, 동일 userId 가 중복 오면 첫 건만 반영한다.
     *
     * @throws ResponseStatusException 404(회의 없음)
     */
    @Transactional
    fun saveSummary(meetingId: Long, result: MeetingSummaryResult) {
        val meeting = meetingRepository.findById(meetingId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "회의를 찾을 수 없습니다: $meetingId")
        }
        meeting.summary = result.summary

        val byUserId = attendanceRepository.findAllByMeeting_MeetingId(meetingId)
            .associateBy { it.user.userId }
        val applied = mutableSetOf<Long>()

        result.actionItems.forEach { item ->
            val attendance = byUserId[item.userId]
            when {
                attendance == null ->
                    log.warn("[chat-archive] 회의 {} — 참석자 아닌 userId={} 액션아이템 무시", meetingId, item.userId)
                !applied.add(item.userId) ->
                    log.warn("[chat-archive] 회의 {} — userId={} 액션아이템 중복, 첫 건만 사용", meetingId, item.userId)
                else ->
                    attendance.actionItem = item.actionItem
            }
        }
    }
}

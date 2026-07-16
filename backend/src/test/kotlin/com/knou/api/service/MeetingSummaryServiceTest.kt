package com.knou.api.service

import com.knou.api.client.ActionItemResult
import com.knou.api.client.MeetingSummaryResult
import com.knou.api.dto.meeting.MeetingMessageResponse
import com.knou.api.entity.MeetingAttendanceEntity
import com.knou.api.entity.MeetingEntity
import com.knou.api.entity.UserEntity
import com.knou.api.repository.MeetingAttendanceRepository
import com.knou.api.repository.MeetingRepository
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.time.LocalDateTime
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertNull

class MeetingSummaryServiceTest {

    private val meetingRepository = mock<MeetingRepository>()
    private val attendanceRepository = mock<MeetingAttendanceRepository>()
    private val service = MeetingSummaryService(meetingRepository, attendanceRepository)

    private fun user(id: Long, name: String) = UserEntity(
        email = "$name@test.com", name = name, language = "KO", fontSize = "MEDIUM",
    ).apply { userId = id }

    private fun meeting(id: Long) = MeetingEntity(
        title = "주간 회의", meetingDate = LocalDateTime.now(), meetingCode = "ABC123", status = "ENDED",
    ).apply { meetingId = id }

    private fun attendance(m: MeetingEntity, u: UserEntity) =
        MeetingAttendanceEntity(meeting = m, user = u)

    private fun message(userId: Long, name: String, text: String) = MeetingMessageResponse(
        messageId = userId, userId = userId, speakerName = name,
        spokenAt = LocalDateTime.now(), original = text, translated = null, lang = null,
    )

    @Test
    fun `recordSpeechCounts - userId 로 매칭해 발화 수 집계, 참석자 아닌 발화자는 무시`() {
        val m = meeting(1)
        val a1 = attendance(m, user(10, "고윤아"))
        val a2 = attendance(m, user(20, "김철수"))
        whenever(meetingRepository.existsById(1)).thenReturn(true)
        whenever(attendanceRepository.findAllByMeeting_MeetingId(1)).thenReturn(listOf(a1, a2))

        val messages = listOf(
            message(10, "고윤아", "안녕하세요"),
            message(10, "고윤아", "시작하죠"),
            message(20, "김철수", "네"),
            message(99, "외부인", "참석기록 없음"), // 무시 대상
        )

        val ctx = service.recordSpeechCounts(1, messages)

        assertEquals(2, a1.speechCount)
        assertEquals(1, a2.speechCount)
        assertEquals(listOf(10L, 20L), ctx.attendees.map { it.userId })
    }

    @Test
    fun `saveSummary - summary 저장 + userId 매칭 액션아이템 저장, 미매칭 무시`() {
        val m = meeting(1)
        val a1 = attendance(m, user(10, "고윤아"))
        val a2 = attendance(m, user(20, "김철수"))
        whenever(meetingRepository.findById(1)).thenReturn(Optional.of(m))
        whenever(attendanceRepository.findAllByMeeting_MeetingId(1)).thenReturn(listOf(a1, a2))

        val result = MeetingSummaryResult(
            summary = "다음 분기 로드맵을 논의했다.",
            actionItems = listOf(
                ActionItemResult(10, "API 명세 정리"),
                ActionItemResult(99, "참석자 아님 — 무시"),
            ),
        )

        service.saveSummary(1, result)

        assertEquals("다음 분기 로드맵을 논의했다.", m.summary)
        assertEquals("API 명세 정리", a1.actionItem)
        assertNull(a2.actionItem) // 액션아이템 없는 참석자는 그대로 null
    }

    @Test
    fun `saveSummary - 동일 userId 중복 액션아이템은 첫 건만 저장`() {
        val m = meeting(1)
        val a1 = attendance(m, user(10, "고윤아"))
        whenever(meetingRepository.findById(1)).thenReturn(Optional.of(m))
        whenever(attendanceRepository.findAllByMeeting_MeetingId(1)).thenReturn(listOf(a1))

        val result = MeetingSummaryResult(
            summary = "요약",
            actionItems = listOf(
                ActionItemResult(10, "첫 번째 할 일"),
                ActionItemResult(10, "두 번째 (무시)"),
            ),
        )

        service.saveSummary(1, result)

        assertEquals("첫 번째 할 일", a1.actionItem)
    }
}

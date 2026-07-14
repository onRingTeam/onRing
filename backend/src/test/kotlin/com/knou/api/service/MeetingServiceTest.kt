package com.knou.api.service

import com.knou.api.entity.MeetingEntity
import com.knou.api.repository.MeetingAttendanceRepository
import com.knou.api.repository.MeetingRepository
import com.knou.api.repository.UserRepository
import com.knou.api.websocket.MeetingChatBuffer
import com.knou.api.websocket.MeetingSummaryMissingEvent
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.context.ApplicationEventPublisher
import java.time.LocalDateTime
import java.util.Optional

/**
 * [MeetingService.detail] 의 온디맨드 재생성 트리거 검증.
 * 종료 + 요약 없음 → [MeetingSummaryMissingEvent] 발행, 그 외 → 미발행.
 */
class MeetingServiceTest {

    private val meetingRepository = mock<MeetingRepository>()
    private val userRepository = mock<UserRepository>()
    private val attendanceRepository = mock<MeetingAttendanceRepository>()
    private val chatBuffer = mock<MeetingChatBuffer>()
    private val eventPublisher = mock<ApplicationEventPublisher>()
    private val service = MeetingService(
        meetingRepository, userRepository, attendanceRepository, chatBuffer, eventPublisher,
    )

    private fun meeting(id: Long, status: String, summary: String?) = MeetingEntity(
        title = "주간 회의", meetingDate = LocalDateTime.now(), meetingCode = "ABC123", status = status,
    ).apply {
        meetingId = id
        this.summary = summary
    }

    @Test
    fun `detail - 종료됐고 요약 없으면 재생성 이벤트 발행`() {
        whenever(meetingRepository.findById(1)).thenReturn(Optional.of(meeting(1, "ENDED", null)))
        whenever(attendanceRepository.findAllByMeeting_MeetingId(1)).thenReturn(emptyList())

        service.detail(1)

        verify(eventPublisher).publishEvent(MeetingSummaryMissingEvent(1))
    }

    @Test
    fun `detail - 요약이 이미 있으면 이벤트 미발행`() {
        whenever(meetingRepository.findById(1)).thenReturn(Optional.of(meeting(1, "ENDED", "이미 있는 요약")))
        whenever(attendanceRepository.findAllByMeeting_MeetingId(1)).thenReturn(emptyList())

        service.detail(1)

        verify(eventPublisher, never()).publishEvent(any())
    }

    @Test
    fun `detail - 진행중 회의는 요약 없어도 이벤트 미발행`() {
        whenever(meetingRepository.findById(1)).thenReturn(Optional.of(meeting(1, "IN_PROGRESS", null)))
        whenever(attendanceRepository.findAllByMeeting_MeetingId(1)).thenReturn(emptyList())

        service.detail(1)

        verify(eventPublisher, never()).publishEvent(any())
    }
}

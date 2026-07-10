package com.knou.api.service

import com.knou.api.dto.meeting.MeetingMessageResponse
import com.knou.api.entity.MeetingEntity
import com.knou.api.entity.MeetingMessageEntity
import com.knou.api.repository.MeetingMessageRepository
import com.knou.api.repository.MeetingRepository
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class MeetingTranscriptServiceTest {

    private val meetingRepository = mock<MeetingRepository>()
    private val messageRepository = mock<MeetingMessageRepository>()
    private val service = MeetingTranscriptService(meetingRepository, messageRepository)

    private fun meeting(id: Long) = MeetingEntity(
        title = "주간 회의", meetingDate = LocalDateTime.now(), meetingCode = "ABC123", status = "ENDED",
    ).apply { meetingId = id }

    private fun message(userId: Long, name: String, text: String, at: LocalDateTime) = MeetingMessageResponse(
        messageId = 0, userId = userId, speakerName = name,
        spokenAt = at, original = text, translated = null,
    )

    @Test
    fun `saveTranscript - 메시지를 엔티티로 매핑해 저장`() {
        val m = meeting(1)
        val base = LocalDateTime.of(2026, 6, 26, 14, 0, 0)
        whenever(meetingRepository.findById(1)).thenReturn(Optional.of(m))
        whenever(messageRepository.existsByMeeting_MeetingId(1)).thenReturn(false)

        val messages = listOf(
            message(10, "고윤아", "안녕하세요", base),
            message(20, "김철수", "네", base.plusSeconds(5)),
        )

        service.saveTranscript(1, messages)

        val captor = argumentCaptor<List<MeetingMessageEntity>>()
        verify(messageRepository).saveAll(captor.capture())
        val saved = captor.firstValue
        assertEquals(2, saved.size)
        assertEquals(listOf(10L, 20L), saved.map { it.userId })
        assertEquals(listOf("고윤아", "김철수"), saved.map { it.speakerName })
        assertEquals(listOf("안녕하세요", "네"), saved.map { it.original })
        assertEquals(m, saved[0].meeting)
    }

    @Test
    fun `saveTranscript - 이미 저장된 대화가 있으면 재저장하지 않음`() {
        val m = meeting(1)
        whenever(meetingRepository.findById(1)).thenReturn(Optional.of(m))
        whenever(messageRepository.existsByMeeting_MeetingId(1)).thenReturn(true)

        service.saveTranscript(1, listOf(message(10, "고윤아", "안녕", LocalDateTime.now())))

        verify(messageRepository, never()).saveAll(any<List<MeetingMessageEntity>>())
    }

    @Test
    fun `saveTranscript - 회의가 없으면 404`() {
        whenever(meetingRepository.findById(99)).thenReturn(Optional.empty())

        assertFailsWith<ResponseStatusException> {
            service.saveTranscript(99, listOf(message(10, "고윤아", "안녕", LocalDateTime.now())))
        }
    }

    @Test
    fun `transcript - 저장된 대화를 시간순 DTO 로 반환`() {
        val m = meeting(1)
        val base = LocalDateTime.of(2026, 6, 26, 14, 0, 0)
        val e1 = MeetingMessageEntity(m, 10, "고윤아", base, "안녕하세요").apply { messageId = 1 }
        val e2 = MeetingMessageEntity(m, 20, "김철수", base.plusSeconds(5), "네").apply { messageId = 2 }
        whenever(meetingRepository.existsById(1)).thenReturn(true)
        whenever(messageRepository.findAllByMeeting_MeetingIdOrderBySpokenAtAscMessageIdAsc(1))
            .thenReturn(listOf(e1, e2))

        val result = service.transcript(1)

        assertEquals(listOf(1L, 2L), result.map { it.messageId })
        assertEquals(listOf("안녕하세요", "네"), result.map { it.original })
        assertEquals("고윤아", result[0].speakerName)
    }

    @Test
    fun `transcript - 회의가 없으면 404`() {
        whenever(meetingRepository.existsById(99)).thenReturn(false)

        assertFailsWith<ResponseStatusException> { service.transcript(99) }
    }
}

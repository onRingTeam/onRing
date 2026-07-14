package com.knou.api.websocket

import com.knou.api.client.ActionItemResult
import com.knou.api.client.AttendeeInfo
import com.knou.api.client.GeminiClient
import com.knou.api.client.MeetingSummaryResult
import com.knou.api.dto.meeting.MeetingMessageResponse
import com.knou.api.service.MeetingSummaryService
import com.knou.api.service.MeetingTranscriptService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.times
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.time.LocalDateTime

/**
 * [MeetingSummaryRegenerationListener] 온디맨드 재생성 검증.
 */
class MeetingSummaryRegenerationListenerTest {

    private val transcriptService = mock<MeetingTranscriptService>()
    private val summaryService = mock<MeetingSummaryService>()
    private val geminiClient = mock<GeminiClient>()
    private val listener = MeetingSummaryRegenerationListener(transcriptService, summaryService, geminiClient)

    private fun message(text: String) = MeetingMessageResponse(
        messageId = 0, userId = 10, speakerName = "고윤아",
        spokenAt = LocalDateTime.of(2026, 7, 14, 14, 0), original = text, translated = null, lang = null,
    )

    private val result = MeetingSummaryResult(
        summary = "재생성된 요약",
        actionItems = listOf(ActionItemResult(10, "API 명세 정리")),
    )

    @Test
    fun `정상 - 저장된 대화로 요약 재생성 후 저장`() {
        whenever(geminiClient.isConfigured()).thenReturn(true)
        whenever(transcriptService.transcript(1)).thenReturn(listOf(message("안녕하세요")))
        whenever(summaryService.attendeesOf(1)).thenReturn(listOf(AttendeeInfo(10, "고윤아")))
        whenever(geminiClient.summarizeMeeting(any(), any())).thenReturn(result)

        listener.onSummaryMissing(MeetingSummaryMissingEvent(1))

        verify(summaryService).saveSummary(eq(1L), eq(result))
    }

    @Test
    fun `저장된 대화 없으면 요약하지 않음`() {
        whenever(geminiClient.isConfigured()).thenReturn(true)
        whenever(transcriptService.transcript(1)).thenReturn(emptyList())

        listener.onSummaryMissing(MeetingSummaryMissingEvent(1))

        verify(geminiClient, never()).summarizeMeeting(any(), any())
        verify(summaryService, never()).saveSummary(any(), any())
    }

    @Test
    fun `apiKey 미설정이면 아무 것도 하지 않음`() {
        whenever(geminiClient.isConfigured()).thenReturn(false)

        listener.onSummaryMissing(MeetingSummaryMissingEvent(1))

        verify(transcriptService, never()).transcript(any())
        verify(geminiClient, never()).summarizeMeeting(any(), any())
    }

    @Test
    fun `재생성 진행 중 같은 회의 재진입은 중복 없이 무시`() {
        whenever(geminiClient.isConfigured()).thenReturn(true)
        whenever(transcriptService.transcript(1)).thenReturn(listOf(message("안녕하세요")))
        whenever(summaryService.attendeesOf(1)).thenReturn(listOf(AttendeeInfo(10, "고윤아")))
        // 요약 중 같은 회의를 다시 조회한 상황을 모사 — in-flight 가드로 재진입은 즉시 무시돼야 함
        whenever(geminiClient.summarizeMeeting(any(), any())).thenAnswer {
            listener.onSummaryMissing(MeetingSummaryMissingEvent(1))
            result
        }

        listener.onSummaryMissing(MeetingSummaryMissingEvent(1))

        verify(geminiClient, times(1)).summarizeMeeting(any(), any())
        verify(summaryService, times(1)).saveSummary(eq(1L), eq(result))
    }
}

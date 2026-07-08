package com.knou.api.websocket

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.knou.api.client.GeminiClient
import com.knou.api.client.MeetingSummaryResult
import com.knou.api.dto.meeting.MeetingMessageResponse
import com.knou.api.service.MeetingContext
import com.knou.api.service.MeetingSummaryService
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component

/**
 * 회의 종료 시 발행되는 [MeetingChatArchivedEvent] 수신 지점.
 *
 * 채팅 내역 전체(JSON)가 이벤트에 담겨 오며, 버퍼는 이미 폐기된 뒤이므로
 * 여기서 받지 않으면 내역은 유실된다.
 *
 * 후처리 흐름 (@Async — 회의 종료 API 응답을 막지 않음):
 *   TX1 발화 수 집계 → Gemini 요약(실패 시 1회 재시도) → TX2 요약·액션아이템 저장.
 * 요약 실패는 회의 종료 자체에 영향이 없으므로 로그만 남기고 summary=null 로 둔다
 * (프론트는 폴링 상한 도달 후 '요약 없음' 표시).
 */
@Component
class MeetingChatArchivedListener(
    private val objectMapper: ObjectMapper,
    private val summaryService: MeetingSummaryService,
    private val geminiClient: GeminiClient,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Async
    @EventListener
    fun onChatArchived(event: MeetingChatArchivedEvent) {
        try {
            val messages: List<MeetingMessageResponse> = objectMapper.readValue(event.messagesJson)

            // TX1: 발화 수 집계 (LLM 실패와 무관하게 먼저 확정)
            val context = summaryService.recordSpeechCounts(event.meetingId, messages)

            if (!geminiClient.isConfigured()) {
                log.warn("[chat-archive] 회의 {} — GEMINI_API_KEY 미설정, 요약 생략", event.meetingId)
                return
            }

            // Gemini 요약 (1회 재시도)
            val result = summarizeWithRetry(event.meetingId, context, messages)

            // TX2: 요약·액션아이템 저장
            summaryService.saveSummary(event.meetingId, result)
            log.info("[chat-archive] 회의 {} 요약 완료 (채팅 {}건)", event.meetingId, event.messageCount)
        } catch (e: Exception) {
            log.error("[chat-archive] 회의 {} 요약 생성 실패", event.meetingId, e)
        }
    }

    /** Gemini 호출 — 실패 시 2초 후 1회만 재시도. */
    private fun summarizeWithRetry(
        meetingId: Long,
        context: MeetingContext,
        messages: List<MeetingMessageResponse>,
    ): MeetingSummaryResult {
        return try {
            geminiClient.summarizeMeeting(context.attendees, messages)
        } catch (e: Exception) {
            log.warn("[chat-archive] 회의 {} 요약 1차 실패, 재시도: {}", meetingId, e.message)
            Thread.sleep(2_000)
            geminiClient.summarizeMeeting(context.attendees, messages)
        }
    }
}

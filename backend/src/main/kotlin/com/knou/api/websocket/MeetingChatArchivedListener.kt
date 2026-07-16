package com.knou.api.websocket

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.knou.api.client.GeminiClient
import com.knou.api.dto.meeting.MeetingMessageResponse
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
 *   TX1 발화 수 집계 → Gemini 요약 → TX2 요약·액션아이템 저장.
 * 요약 호출의 재시도·폴백은 [GeminiClient] 가 담당한다(503 과부하 대응).
 * 요약 실패는 회의 종료 자체에 영향이 없으므로 로그만 남기고 summary=null 로 둔다.
 * 이때 상세 조회 시 [MeetingSummaryRegenerationListener] 가 온디맨드로 재생성을 시도한다.
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

            // Gemini 요약 (재시도·폴백은 GeminiClient 내부에서 처리)
            val result = geminiClient.summarizeMeeting(context.attendees, messages)

            // TX2: 요약·액션아이템 저장
            summaryService.saveSummary(event.meetingId, result)
            log.info("[chat-archive] 회의 {} 요약 완료 (채팅 {}건)", event.meetingId, event.messageCount)
        } catch (e: Exception) {
            log.error("[chat-archive] 회의 {} 요약 생성 실패", event.meetingId, e)
        }
    }
}

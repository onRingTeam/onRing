package com.knou.api.websocket

import com.knou.api.client.GeminiClient
import com.knou.api.service.MeetingSummaryService
import com.knou.api.service.MeetingTranscriptService
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

/**
 * 상세 조회 시 요약이 없을 때([MeetingSummaryMissingEvent]) 요약을 온디맨드로 재생성한다.
 *
 * 회의 직후 요약이 실패(예: Gemini 503 과부하)해도 대화는 DB 에 영속화돼 있으므로
 * ([MeetingChatPersistListener]), 저장된 대화로 요약을 다시 만들 수 있다.
 * 재시도·폴백은 [GeminiClient] 가 담당하고, 여기서는 오케스트레이션만 한다.
 *
 * @Async — 상세 조회(GET) 응답을 막지 않고 백그라운드에서 수행한다.
 * 재생성이 끝나면 프론트 폴링이 다음 조회에서 요약을 받아 표시한다.
 */
@Component
class MeetingSummaryRegenerationListener(
    private val transcriptService: MeetingTranscriptService,
    private val summaryService: MeetingSummaryService,
    private val geminiClient: GeminiClient,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    /** 재생성 진행 중인 회의 — 프론트 폴링이 짧은 간격으로 여러 번 조회해도 작업은 1건만 돌게 한다. */
    private val inFlight = ConcurrentHashMap.newKeySet<Long>()

    @Async
    @EventListener
    fun onSummaryMissing(event: MeetingSummaryMissingEvent) {
        val meetingId = event.meetingId
        if (!geminiClient.isConfigured()) return
        // 이미 재생성 중이면 즉시 반환 (중복 방지)
        if (!inFlight.add(meetingId)) return
        try {
            val messages = transcriptService.transcript(meetingId)
            if (messages.isEmpty()) {
                // 저장된 대화가 없으면 요약할 것이 없다 (발화 없던 회의 등).
                return
            }
            val attendees = summaryService.attendeesOf(meetingId)
            val result = geminiClient.summarizeMeeting(attendees, messages)
            summaryService.saveSummary(meetingId, result)
            log.info("[summary-regen] 회의 {} 요약 재생성 완료 (대화 {}건)", meetingId, messages.size)
        } catch (e: Exception) {
            // 실패해도 summary=null 유지 — 다음 상세 조회가 다시 트리거한다.
            log.warn("[summary-regen] 회의 {} 요약 재생성 실패: {}", meetingId, e.message)
        } finally {
            inFlight.remove(meetingId)
        }
    }
}

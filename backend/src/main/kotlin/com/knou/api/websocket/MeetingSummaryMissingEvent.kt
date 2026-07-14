package com.knou.api.websocket

/**
 * 종료된 회의를 상세 조회했는데 AI 요약이 아직 없을 때 발행되는 이벤트.
 *
 * 회의 직후 요약이 실패(예: Gemini 503 과부하)해 summary=null 로 남은 경우,
 * 상세 조회(GET /api/meetings/{id})가 이 이벤트를 발행하고
 * [MeetingSummaryRegenerationListener] 가 저장된 대화로 요약을 온디맨드 재생성한다.
 *
 * 발행: [com.knou.api.service.MeetingService.detail]
 * 수신: [MeetingSummaryRegenerationListener]
 */
data class MeetingSummaryMissingEvent(val meetingId: Long)

package com.knou.api.controller

import com.knou.api.dto.common.ExportFormat
import com.knou.api.dto.common.PageResponse
import com.knou.api.dto.meeting.CreateMeetingRequest
import com.knou.api.dto.meeting.DeleteMeetingsRequest
import com.knou.api.dto.meeting.ExportRequest
import com.knou.api.dto.meeting.JoinMeetingRequest
import com.knou.api.dto.meeting.MeetingDetailResponse
import com.knou.api.dto.meeting.MeetingListItemResponse
import com.knou.api.dto.meeting.MeetingMessageResponse
import com.knou.api.dto.meeting.MeetingRoomResponse
import com.knou.api.service.MeetingService
import com.knou.api.service.MeetingTranscriptService
import com.knou.api.websocket.MeetingStatusEvent
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDateTime

/**
 * 홈(2) · 회의록(3) · 상세회의(4) · 회의화면(5) - 회의 관련 API.
 *
 * NOTE: 인증 도입 전까지 현재 사용자는 `X-User-Id` 헤더로 식별한다. (TODO: JWT 적용)
 * 실제 비즈니스 로직(코드 생성, AI 요약, 권한 체크 등)은 서비스 계층에서 구현 예정.
 */
@Tag(name = "Meeting", description = "회의 생성/참여/조회/내보내기")
@RestController
@RequestMapping("/api/meetings")
class MeetingController(
    private val meetingService: MeetingService,
    private val transcriptService: MeetingTranscriptService,
    private val messagingTemplate: SimpMessagingTemplate,
) {

    @Operation(summary = "신규 회의 생성", description = "회의명·내 언어로 회의를 생성한다. 회의 코드는 '날짜+회의명 첫글자+UUID'로 자동 생성. (화면 2-b-i-1)")
    @PostMapping
    fun createMeeting(
        @RequestHeader("X-User-Id") userId: Long,
        @Valid @RequestBody request: CreateMeetingRequest,
    ): ResponseEntity<MeetingRoomResponse> {
        return ResponseEntity.ok(meetingService.create(userId, request))
    }

    @Operation(summary = "회의 참여", description = "회의 코드로 진행중 회의에 참여한다. 종료/존재하지 않는 코드는 에러. (화면 2-c-i)")
    @PostMapping("/join")
    fun joinMeeting(
        @RequestHeader("X-User-Id") userId: Long,
        @Valid @RequestBody request: JoinMeetingRequest,
    ): ResponseEntity<MeetingRoomResponse> {
        return ResponseEntity.ok(meetingService.join(userId, request.meetingCode))
    }

    @Operation(
        summary = "현재 진행중인 내 회의 조회",
        description = "내가 참여 중인 IN_PROGRESS 회의를 반환한다. 없으면 204 No Content. " +
            "회의 탭 빨간 배경 표시(1-c)·홈→회의 탭 동적 분기(1-c-i)·새 회의 생성 시 confirm(2-b-i-1) 판단에 사용. (화면 1-c)",
    )
    @GetMapping("/active")
    fun getActiveMeeting(
        @RequestHeader("X-User-Id") userId: Long,
    ): ResponseEntity<MeetingRoomResponse> {
        val active = meetingService.activeMeeting(userId)
        return if (active != null) ResponseEntity.ok(active) else ResponseEntity.noContent().build()
    }

    @Operation(summary = "최근 회의 목록", description = "홈 화면에 노출할 최근 회의 4건. (화면 2-d)")
    @GetMapping("/recent")
    fun getRecentMeetings(
        @RequestHeader("X-User-Id") userId: Long,
    ): ResponseEntity<List<MeetingListItemResponse>> {
        return ResponseEntity.ok(meetingService.recent(userId))
    }

    @Operation(
        summary = "회의록 목록/검색",
        description = "회의명·코드·요약 기준 like 검색 및 즐겨찾기 필터. (화면 3-b, 3-c, 3-d)",
    )
    @GetMapping
    fun getMeetings(
        @RequestHeader("X-User-Id") userId: Long,
        @Parameter(description = "검색어 (회의명/코드/요약 like)") @RequestParam(required = false) keyword: String?,
        @Parameter(description = "즐겨찾기만 조회") @RequestParam(defaultValue = "false") favoriteOnly: Boolean,
        @Parameter(description = "페이지 (0-base)") @RequestParam(defaultValue = "0") page: Int,
        @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<PageResponse<MeetingListItemResponse>> {
        return ResponseEntity.ok(meetingService.search(userId, keyword, favoriteOnly, page, size))
    }

    @Operation(summary = "상세회의 - AI 요약", description = "요약 내용·액션아이템·화자별 발화빈도. (화면 4-b, 4-c)")
    @GetMapping("/{meetingId}")
    fun getMeetingDetail(
        @RequestHeader("X-User-Id") userId: Long,
        @PathVariable meetingId: Long,
    ): ResponseEntity<MeetingDetailResponse> {
        return ResponseEntity.ok(meetingService.detail(meetingId))
    }

    @Operation(
        summary = "진행중 회의 - 놓친 메시지 복구",
        description = "진행중 회의의 인메모리 버퍼에서 메시지를 조회한다. " +
            "after 지정 시 해당 시각 이후만 반환 — 웹소켓 재연결 시 놓친 메시지 복구용. " +
            "종료된 회의의 전체 대화는 GET /transcript 를 사용한다.",
    )
    @GetMapping("/{meetingId}/messages")
    fun getMeetingMessages(
        @RequestHeader("X-User-Id") userId: Long,
        @PathVariable meetingId: Long,
        @Parameter(description = "이 시각(ISO-8601) 이후 메시지만 조회")
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        after: LocalDateTime?,
    ): ResponseEntity<List<MeetingMessageResponse>> {
        return ResponseEntity.ok(meetingService.messages(meetingId, after))
    }

    @Operation(
        summary = "상세회의 - 전체 대화",
        description = "종료된 회의의 저장된 전체 대화를 시간순으로 반환한다. " +
            "발화자·시간·원문·번역 메시지 목록. (화면 4-d)",
    )
    @GetMapping("/{meetingId}/transcript")
    fun getMeetingTranscript(
        @RequestHeader("X-User-Id") userId: Long,
        @PathVariable meetingId: Long,
    ): ResponseEntity<List<MeetingMessageResponse>> {
        return ResponseEntity.ok(transcriptService.transcript(meetingId))
    }

    @Operation(summary = "즐겨찾기 토글", description = "회의 즐겨찾기 여부를 토글한다. (화면 3-c, 3-d)")
    @PatchMapping("/{meetingId}/favorite")
    fun toggleFavorite(
        @RequestHeader("X-User-Id") userId: Long,
        @PathVariable meetingId: Long,
    ): ResponseEntity<Void> {
        meetingService.toggleFavorite(userId, meetingId)
        return ResponseEntity.noContent().build()
    }

    @Operation(
        summary = "회의록 선택 삭제",
        description = "선택한 회의들의 내 참석 레코드 use_yn 을 N 으로 바꿔 내 회의록 목록에서 숨긴다. " +
            "참석자별 소프트 삭제라 다른 참석자에게는 영향이 없다. (회의록 화면 삭제 모드)",
    )
    @PostMapping("/delete")
    fun deleteMeetings(
        @RequestHeader("X-User-Id") userId: Long,
        @Valid @RequestBody request: DeleteMeetingsRequest,
    ): ResponseEntity<Void> {
        meetingService.delete(userId, request.meetingIds)
        return ResponseEntity.noContent().build()
    }

    @Operation(summary = "회의 종료", description = "개설자만 회의를 종료할 수 있다. (화면 5-a-1)")
    @PostMapping("/{meetingId}/end")
    fun endMeeting(
        @RequestHeader("X-User-Id") userId: Long,
        @PathVariable meetingId: Long,
    ): ResponseEntity<Void> {
        meetingService.end(userId, meetingId)
        meetingService.clearChat(meetingId)
        // 참여자 전원에게 종료 알림 — 수신 측은 회의 화면을 정리하고 요약 화면으로 이동
        messagingTemplate.convertAndSend(
            "/topic/meetings/$meetingId/status",
            MeetingStatusEvent(type = "ENDED", meetingId = meetingId, occurredAt = LocalDateTime.now()),
        )
        return ResponseEntity.noContent().build()
    }

    @Operation(summary = "회의록 내보내기", description = "PDF/TXT로 내보낸다. AI요약/전체대화 포함 여부 선택. (화면 3-d-ii, 4-c-iii)")
    @PostMapping("/{meetingId}/export")
    fun exportMeeting(
        @RequestHeader("X-User-Id") userId: Long,
        @PathVariable meetingId: Long,
        @Valid @RequestBody request: ExportRequest,
    ): ResponseEntity<ByteArray> {
        // TODO: MeetingService.export(meetingId, request) — 파일 바이트 + Content-Disposition
        val contentType = if (request.format == ExportFormat.PDF) "application/pdf" else "text/plain"
        return ResponseEntity.ok()
            .header("Content-Type", contentType)
            .body(ByteArray(0))
    }
}

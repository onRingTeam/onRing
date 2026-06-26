package com.knou.api.dto.meeting

import com.knou.api.dto.common.ExportFormat
import com.knou.api.dto.common.Language
import com.knou.api.dto.common.MeetingStatus
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

/**
 * 홈(2) · 회의록(3) · 상세회의(4) · 회의화면(5) 의 DTO 모음.
 */

// ===========================================================================
// 신규 회의 생성 — POST /api/meetings  (화면정의서 2-b-i-1)
// ===========================================================================
@Schema(description = "신규 회의 생성 요청")
data class CreateMeetingRequest(
    @field:Schema(description = "회의명", example = "주간 정기회의")
    @field:NotBlank
    @field:Size(max = 200)
    val title: String,

    @field:Schema(description = "내 언어 (기본값=내 설정 언어)")
    val language: Language,
)

@Schema(description = "회의 생성/참여 결과 (회의실 진입 정보)")
data class MeetingRoomResponse(
    @field:Schema(description = "회의 ID", example = "10")
    val meetingId: Long,

    @field:Schema(description = "회의명", example = "주간 정기회의")
    val title: String,

    @field:Schema(description = "회의 코드 (날짜+회의명 첫글자+UUID 자동 생성)", example = "20260626J-3f9a2b")
    val meetingCode: String,

    @field:Schema(description = "회의 상태")
    val status: MeetingStatus,

    @field:Schema(description = "개설자 여부 (true면 종료 버튼 노출)", example = "true")
    val host: Boolean,
)

// ===========================================================================
// 회의 참여 — POST /api/meetings/join  (화면정의서 2-c-i)
// ===========================================================================
@Schema(description = "회의 코드로 참여 요청")
data class JoinMeetingRequest(
    @field:Schema(description = "회의 코드", example = "20260626J-3f9a2b")
    @field:NotBlank
    val meetingCode: String,
)

// ===========================================================================
// 회의 목록 (홈 최근 4건 / 회의록 목록·검색) — GET /api/meetings, /recent
// 화면정의서 2-d, 3-b, 3-d
// ===========================================================================
@Schema(description = "회의록 목록 카드 항목")
data class MeetingListItemResponse(
    @field:Schema(description = "회의 ID", example = "10")
    val meetingId: Long,

    @field:Schema(description = "회의명", example = "주간 정기회의")
    val title: String,

    @field:Schema(description = "즐겨찾기 여부", example = "false")
    val favorite: Boolean,

    @field:Schema(description = "회의 날짜", example = "2026-06-26T14:00:00")
    val meetingDate: LocalDateTime,

    @field:Schema(description = "총 회의 시간(초)", example = "3600")
    val durationSec: Int?,

    @field:Schema(description = "참여 인원명 목록", example = "[\"고윤아\", \"김철수\"]")
    val participantNames: List<String>,

    @field:Schema(description = "사용 언어 목록")
    val languages: List<Language>,

    @field:Schema(description = "요약 내용", example = "다음 분기 로드맵 논의 ...")
    val summary: String?,

    @field:Schema(description = "회의 상태")
    val status: MeetingStatus,
)

// ===========================================================================
// 상세회의 - AI 요약 탭 — GET /api/meetings/{meetingId}
// 화면정의서 4-b, 4-c
// ===========================================================================
@Schema(description = "상세회의 - AI 요약 응답")
data class MeetingDetailResponse(
    @field:Schema(description = "회의 ID", example = "10")
    val meetingId: Long,

    @field:Schema(description = "회의명", example = "주간 정기회의")
    val title: String,

    @field:Schema(description = "회의 날짜", example = "2026-06-26T14:00:00")
    val meetingDate: LocalDateTime,

    @field:Schema(description = "참여자 수", example = "4")
    val participantCount: Int,

    @field:Schema(description = "참여 언어 수", example = "2")
    val languageCount: Int,

    @field:Schema(description = "총 회의 시간(초)", example = "3600")
    val durationSec: Int?,

    @field:Schema(description = "AI 요약 내용")
    val summary: String?,

    @field:Schema(description = "화자별 발화 통계 (액션아이템·발화빈도)")
    val speakers: List<SpeakerStatResponse>,
)

@Schema(description = "화자별 발화 통계")
data class SpeakerStatResponse(
    @field:Schema(description = "회원 ID", example = "1")
    val userId: Long,

    @field:Schema(description = "화자명", example = "고윤아")
    val name: String,

    @field:Schema(description = "액션 아이템 (화자별 발언 요약)", example = "API 명세 정리 담당")
    val actionItem: String?,

    @field:Schema(description = "발화 횟수", example = "12")
    val speechCount: Int,

    @field:Schema(description = "발화 비율(%)", example = "34.2")
    val speechRatio: Double,
)

// ===========================================================================
// 상세회의 - 전체 대화 탭 — GET /api/meetings/{meetingId}/messages
// 화면정의서 4-d
// ===========================================================================
@Schema(description = "전체 대화 메시지 (발화자·시간·원문·번역)")
data class MeetingMessageResponse(
    @field:Schema(description = "메시지 ID", example = "1001")
    val messageId: Long,

    @field:Schema(description = "발화자명", example = "고윤아")
    val speakerName: String,

    @field:Schema(description = "발화 시각", example = "2026-06-26T14:05:12")
    val spokenAt: LocalDateTime,

    @field:Schema(description = "원문", example = "안녕하세요")
    val original: String,

    @field:Schema(description = "번역문 (조회자 언어 기준)", example = "Hello")
    val translated: String?,
)

// ===========================================================================
// 내보내기 — GET /api/meetings/{meetingId}/export  (화면정의서 3-d-ii, 4-c-iii)
// ===========================================================================
@Schema(description = "회의록 내보내기 옵션")
data class ExportRequest(
    @field:Schema(description = "파일 형식")
    val format: ExportFormat,

    @field:Schema(description = "AI 요약 포함 여부 (기본 true)", example = "true")
    val includeSummary: Boolean = true,

    @field:Schema(description = "전체 대화 포함 여부 (기본 false)", example = "false")
    val includeFullChat: Boolean = false,
)

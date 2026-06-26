package com.knou.api.dto.user

import com.knou.api.dto.common.FontSize
import com.knou.api.dto.common.Language
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * 설정 화면(6)의 DTO 모음.
 */

// ---------------------------------------------------------------------------
// 내 프로필 조회 — GET /api/users/me  (화면정의서 6-a, 6-c)
// ---------------------------------------------------------------------------
@Schema(description = "내 프로필 + 채팅 설정 응답")
data class UserProfileResponse(
    @field:Schema(description = "회원 ID", example = "1")
    val userId: Long,

    @field:Schema(description = "이메일", example = "user@knou.ac.kr")
    val email: String,

    @field:Schema(description = "회원명", example = "고윤아")
    val name: String,

    @field:Schema(description = "소셜 로그인 여부 (true면 프로필 수정 불가)", example = "true")
    val social: Boolean,

    @field:Schema(description = "구독 여부", example = "false")
    val subscribed: Boolean,

    @field:Schema(description = "잔여 이용 횟수", example = "5")
    val remainingCount: Int,

    @field:Schema(description = "내 언어")
    val language: Language,

    @field:Schema(description = "글씨 크기")
    val fontSize: FontSize,

    @field:Schema(description = "메시지 수신 시 진동 사용 여부", example = "false")
    val vibration: Boolean,
)

// ---------------------------------------------------------------------------
// 프로필 수정 — PATCH /api/users/me/profile  (화면정의서 6-a-i)
// ---------------------------------------------------------------------------
@Schema(description = "프로필 수정 요청 (소셜 로그인 사용자는 불가)")
data class UpdateProfileRequest(
    @field:Schema(description = "변경할 회원명", example = "고윤아")
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
)

// ---------------------------------------------------------------------------
// 채팅 설정 수정 — PATCH /api/users/me/chat-settings  (화면정의서 6-c)
// ---------------------------------------------------------------------------
@Schema(description = "채팅 설정 수정 요청")
data class UpdateChatSettingsRequest(
    @field:Schema(description = "내 언어 (한/일/중/영)")
    val language: Language,

    @field:Schema(description = "글씨 크기 (작게/보통/크게/매우크게)")
    val fontSize: FontSize,

    @field:Schema(description = "메시지 수신 시 진동 사용 여부", example = "true")
    val vibration: Boolean,
)

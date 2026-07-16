package com.knou.api.controller

import com.knou.api.dto.user.UpdateChatSettingsRequest
import com.knou.api.dto.user.UpdateProfileRequest
import com.knou.api.dto.user.UserProfileResponse
import com.knou.api.service.UserService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 설정(6) 화면 - 회원 프로필 / 채팅 설정 API.
 *
 * NOTE: 인증 도입 전까지 현재 사용자는 `X-User-Id` 헤더로 식별한다. (TODO: JWT 적용)
 * 모든 메서드는 컨트롤러 스켈레톤이며 실제 비즈니스 로직은 서비스 계층에서 구현 예정.
 */
@Tag(name = "User", description = "회원 프로필 / 설정")
@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService,
) {

    @Operation(summary = "내 프로필 조회", description = "이름·이메일·구독여부·잔여횟수 및 채팅 설정을 조회한다. (화면 6-a, 6-c)")
    @GetMapping("/me")
    fun getMyProfile(
        @Parameter(description = "현재 사용자 ID (임시)", example = "1")
        @RequestHeader("X-User-Id") userId: Long,
    ): ResponseEntity<UserProfileResponse> {
        return ResponseEntity.ok(userService.getProfile(userId))
    }

    @Operation(summary = "프로필 수정", description = "회원명을 수정한다. 소셜 로그인 사용자는 수정 불가. (화면 6-a-i)")
    @PatchMapping("/me/profile")
    fun updateProfile(
        @RequestHeader("X-User-Id") userId: Long,
        @Valid @RequestBody request: UpdateProfileRequest,
    ): ResponseEntity<Void> {
        userService.updateProfile(userId, request)
        return ResponseEntity.noContent().build()
    }

    @Operation(summary = "채팅 설정 수정", description = "내 언어 / 글씨 크기 / 진동 설정을 수정한다. (화면 6-c)")
    @PatchMapping("/me/chat-settings")
    fun updateChatSettings(
        @RequestHeader("X-User-Id") userId: Long,
        @Valid @RequestBody request: UpdateChatSettingsRequest,
    ): ResponseEntity<Void> {
        userService.updateChatSettings(userId, request)
        return ResponseEntity.noContent().build()
    }
}

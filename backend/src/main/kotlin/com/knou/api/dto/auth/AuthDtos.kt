package com.knou.api.dto.auth

import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank

/** 소셜 로그인 요청. 프론트가 Supabase 에서 받은 access_token 을 넘긴다. */
@Schema(description = "소셜 로그인 요청")
data class LoginRequest(
    @field:NotBlank
    @field:Schema(description = "Supabase access token", example = "eyJhbGciOi...")
    val accessToken: String,
)

/** 소셜 로그인 응답. 백엔드 userId 와 자체 발급 JWT 를 반환한다. */
@Schema(description = "소셜 로그인 응답")
data class LoginResponse(
    @field:Schema(description = "백엔드 회원 ID", example = "1")
    val userId: Long,

    @field:Schema(description = "백엔드 발급 JWT (운영 인증용)")
    val token: String,

    @field:Schema(description = "이메일")
    val email: String,

    @field:Schema(description = "회원명")
    val name: String,
)

package com.knou.api.controller

import com.knou.api.dto.auth.LoginRequest
import com.knou.api.dto.auth.LoginResponse
import com.knou.api.service.AuthService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 인증 API. 소셜 로그인(구글 등) 토큰을 백엔드 세션(userId + JWT)으로 교환한다.
 */
@Tag(name = "Auth", description = "소셜 로그인")
@RestController
@RequestMapping("/auth")
class AuthController(
    private val authService: AuthService,
) {

    @Operation(
        summary = "소셜 로그인",
        description = "Supabase access token 을 검증하여 회원을 조회/생성하고, 백엔드 JWT 를 발급한다.",
    )
    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
    ): ResponseEntity<LoginResponse> {
        return ResponseEntity.ok(authService.loginWithSupabase(request.accessToken))
    }
}

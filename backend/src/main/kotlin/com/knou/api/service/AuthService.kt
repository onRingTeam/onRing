package com.knou.api.service

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import com.knou.api.dto.auth.LoginResponse
import com.knou.api.entity.UserEntity
import com.knou.api.repository.UserRepository
import com.knou.api.security.JwtTokenProvider
import com.knou.api.security.SupabaseProperties
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import org.springframework.web.server.ResponseStatusException

/**
 * 소셜 로그인 처리.
 *  1) Supabase access_token 을 GET /auth/v1/user 로 검증 → 신원(email/name) 확보
 *  2) email 로 회원 조회, 없으면 신규 생성 (프로비저닝)
 *  3) 백엔드 JWT 발급 후 userId 와 함께 반환
 */
@Service
class AuthService(
    private val userRepository: UserRepository,
    private val jwtTokenProvider: JwtTokenProvider,
    private val supabaseProperties: SupabaseProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val restClient = RestClient.create()

    @Transactional
    fun loginWithSupabase(accessToken: String): LoginResponse {
        val supabaseUser = verifyToken(accessToken)
        val email = supabaseUser.email
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일이 없는 계정은 지원하지 않습니다.")

        val user = userRepository.findByEmail(email) ?: createUser(email, supabaseUser.displayName(email))
        val userId = user.userId
            ?: throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "회원 생성 실패")

        val token = jwtTokenProvider.createToken(userId)
        return LoginResponse(userId = userId, token = token, email = user.email, name = user.name)
    }

    /** Supabase 에 토큰 검증 요청. 유효하지 않으면 401. */
    private fun verifyToken(accessToken: String): SupabaseUser {
        if (supabaseProperties.url.isBlank() || supabaseProperties.anonKey.isBlank()) {
            throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase 설정(.env)이 비어있습니다.")
        }
        return try {
            restClient.get()
                .uri("${supabaseProperties.url}/auth/v1/user")
                .header("Authorization", "Bearer $accessToken")
                .header("apikey", supabaseProperties.anonKey)
                .retrieve()
                .body(SupabaseUser::class.java)
                ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "토큰 검증 응답이 비어있습니다.")
        } catch (e: RestClientException) {
            log.warn("[auth] Supabase 토큰 검증 실패: {}", e.message)
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다.")
        }
    }

    /** 신규 회원 생성. language/font_size 는 NOT NULL 이므로 기본값을 채운다. */
    private fun createUser(email: String, name: String): UserEntity {
        val user = UserEntity(
            email = email,
            name = name,
            language = "KO",
            fontSize = "MEDIUM",
        )
        return userRepository.save(user)
    }

    /** Supabase /auth/v1/user 응답의 일부만 매핑. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    data class SupabaseUser(
        val id: String? = null,
        val email: String? = null,
        @JsonProperty("user_metadata") val userMetadata: Map<String, Any?>? = null,
    ) {
        /** 표시 이름: full_name → name → 이메일 로컬파트 순. */
        fun displayName(email: String): String {
            val meta = userMetadata ?: emptyMap()
            return (meta["full_name"] ?: meta["name"])?.toString()?.takeIf { it.isNotBlank() }
                ?: email.substringBefore("@")
        }
    }
}

package com.knou.api.security

import io.jsonwebtoken.JwtException
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * `Authorization: Bearer <token>` 헤더의 JWT 를 검증하고
 * 성공 시 SecurityContext 에 인증 정보를 채운다. (principal = userId: Long)
 *
 * - 토큰이 없으면 그대로 통과(익명) → 보호 리소스 접근 시 SecurityConfig 가 401/403 처리.
 * - 토큰이 유효하지 않으면 컨텍스트를 비우고 통과(인증 안 된 상태).
 */
@Component
class JwtAuthenticationFilter(
    private val tokenProvider: JwtTokenProvider,
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(JwtAuthenticationFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        resolveToken(request)?.let { token ->
            try {
                val userId = tokenProvider.getUserId(token)
                val authentication = UsernamePasswordAuthenticationToken(userId, null, emptyList())
                authentication.details = WebAuthenticationDetailsSource().buildDetails(request)
                SecurityContextHolder.getContext().authentication = authentication
            } catch (e: JwtException) {
                SecurityContextHolder.clearContext()
                log.debug("유효하지 않은 JWT: {}", e.message)
            } catch (e: NumberFormatException) {
                SecurityContextHolder.clearContext()
                log.debug("JWT subject 파싱 실패: {}", e.message)
            }
        }
        filterChain.doFilter(request, response)
    }

    /** `Authorization: Bearer xxx` 에서 토큰 부분만 추출. */
    private fun resolveToken(request: HttpServletRequest): String? {
        val header = request.getHeader("Authorization") ?: return null
        return if (header.startsWith(BEARER_PREFIX)) header.substring(BEARER_PREFIX.length).trim() else null
    }

    companion object {
        private const val BEARER_PREFIX = "Bearer "
    }
}

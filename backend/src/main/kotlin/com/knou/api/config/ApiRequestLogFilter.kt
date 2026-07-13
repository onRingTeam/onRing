package com.knou.api.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.filter.OncePerRequestFilter

/**
 * API 요청 한 줄 로깅 — 로그 뷰어(/admin/logs)에서 트래픽을 실시간으로 볼 수 있게 한다.
 *
 * 형식: `GET /api/meetings/recent?limit=3 → 200 (12ms) ip=1.2.3.4`
 * /api 하위에만 적용 — 정적 리소스·뷰어 자신(/admin/logs)의 셀프 노이즈는 제외.
 */
@Configuration
class ApiRequestLogFilterConfig {

    @Bean
    fun apiRequestLogFilter(): FilterRegistrationBean<OncePerRequestFilter> {
        val log = LoggerFactory.getLogger("com.knou.api.request")

        val filter = object : OncePerRequestFilter() {
            override fun doFilterInternal(
                request: HttpServletRequest,
                response: HttpServletResponse,
                filterChain: FilterChain,
            ) {
                val started = System.currentTimeMillis()
                try {
                    filterChain.doFilter(request, response)
                } finally {
                    val elapsed = System.currentTimeMillis() - started
                    val query = request.queryString?.let { "?$it" } ?: ""
                    log.info(
                        "{} {}{} → {} ({}ms) ip={}",
                        request.method, request.requestURI, query,
                        response.status, elapsed, clientIp(request),
                    )
                }
            }

            // FilterConfig 와 동일한 실제 클라이언트 IP 판별 (Cloudflare 터널 경유 대응)
            private fun clientIp(req: HttpServletRequest): String {
                req.getHeader("CF-Connecting-IP")?.takeIf { it.isNotBlank() }?.let { return it.trim() }
                req.getHeader("X-Forwarded-For")?.takeIf { it.isNotBlank() }
                    ?.let { return it.split(",").first().trim() }
                return req.remoteAddr
            }
        }

        return FilterRegistrationBean<OncePerRequestFilter>(filter).apply {
            addUrlPatterns("/api/*", "/auth/*")
            order = 2  // IP 화이트리스트 필터(0, 1) 통과 후
        }
    }
}

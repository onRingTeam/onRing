package com.knou.api.config

import com.knou.api.utils.ActiveProfileProvider
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.boot.web.servlet.FilterRegistrationBean
import jakarta.servlet.Filter
import jakarta.servlet.FilterChain
import jakarta.servlet.ServletRequest
import jakarta.servlet.ServletResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import java.io.IOException

@Configuration
class FilterConfig(
    private val whiteListProperties: WhiteListProperties
) {

    private val log = LoggerFactory.getLogger(FilterConfig::class.java)

    @Bean
    fun ipRestrictionFilter(): FilterRegistrationBean<Filter> {
        val registration = FilterRegistrationBean<Filter>()

        registration.filter = object : Filter {
            @Throws(IOException::class)
            override fun doFilter(
                request: ServletRequest,
                response: ServletResponse,
                chain: FilterChain
            ) {
                val req = request as HttpServletRequest
                val res = response as HttpServletResponse

                if (!ActiveProfileProvider.isDev()) {
                    chain.doFilter(request, response)
                    return
                }

                val ip = clientIp(req)
                if (ip in whiteListProperties.allowedIps) {
                    chain.doFilter(request, response)
                } else {
                    log.warn("Access denied for ip={} uri={} (allowed={})", ip, req.requestURI, whiteListProperties.allowedIps)
                    res.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied")
                }
            }

            // Cloudflare가 실제 클라이언트 IP를 CF-Connecting-IP에 넣어준다.
            // 터널을 거치지 않은 로컬 접근 등은 remoteAddr로 폴백.
            private fun clientIp(req: HttpServletRequest): String {
                req.getHeader("CF-Connecting-IP")?.takeIf { it.isNotBlank() }?.let { return it.trim() }
                req.getHeader("X-Forwarded-For")?.takeIf { it.isNotBlank() }
                    ?.let { return it.split(",").first().trim() }
                return req.remoteAddr
            }
        }

        registration.addUrlPatterns("/*")
        registration.order = 1
        return registration
    }
}
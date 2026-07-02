package com.knou.api.config

import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.core.Ordered
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.CorsFilter

/**
 * 개발용 CORS. 웹(Expo web, localhost:8081 등) 브라우저에서 백엔드를 호출할 수 있게 허용.
 * 운영(prod)에서는 적용하지 않는다. (네이티브 앱은 CORS 대상이 아니므로 무관)
 */
@Configuration
@Profile("!prod")
class CorsConfig {

    @Bean
    fun corsFilterRegistration(): FilterRegistrationBean<CorsFilter> {
        val config = CorsConfiguration().apply {
            allowCredentials = false
            addAllowedOriginPattern("*")
            addAllowedHeader("*")
            addAllowedMethod("*")
        }
        val source = UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", config)
        }
        return FilterRegistrationBean(CorsFilter(source)).apply {
            // IP 화이트리스트 필터(order=1)보다 먼저 실행 → 프리플라이트 통과.
            order = Ordered.HIGHEST_PRECEDENCE
        }
    }
}

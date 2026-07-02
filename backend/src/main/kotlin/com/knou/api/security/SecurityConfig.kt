package com.knou.api.security

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

/**
 * Spring Security 설정.
 *
 * 목적은 "운영 서버 출입 차단"이다. 프로파일에 따라 정책이 다르다.
 *  - 운영(prod)    : JWT 필수. 토큰이 없거나 유효하지 않으면 403.
 *  - 개발/로컬(그 외): 전부 통과. (접근 제어는 IP 화이트리스트 — [com.knou.api.config.FilterConfig] 가 담당)
 */
@Configuration
class SecurityConfig {

    /**
     * 운영 전용 체인 — JWT 검증 통과한 요청만 허용, 실패 시 403.
     * 헬스체크만 공개.
     */
    @Bean
    @Profile("prod")
    fun prodSecurityFilterChain(
        http: HttpSecurity,
        jwtAuthenticationFilter: JwtAuthenticationFilter,
    ): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .formLogin { it.disable() }
            .httpBasic { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                // 헬스체크 + 로그인(토큰 발급 창구)은 공개.
                it.requestMatchers("/health", "/auth/login").permitAll()
                    .anyRequest().authenticated()
            }
            // 미인증 접근 시 401/302 대신 403 으로 차단
            .exceptionHandling { it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.FORBIDDEN)) }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    /**
     * 개발/로컬 체인 — 전부 통과. (IP 화이트리스트로 이미 보호됨)
     */
    @Bean
    @Profile("!prod")
    fun devSecurityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            // 기본값(DENY) 이면 같은 출처 iframe(테스트 페이지)도 차단되므로 sameOrigin 으로 완화
            .headers { it.frameOptions { fo -> fo.sameOrigin() } }
            .authorizeHttpRequests { it.anyRequest().permitAll() }

        return http.build()
    }
}

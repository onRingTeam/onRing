package com.knou.api.security

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

/**
 * Supabase 설정. application.yml 의 `supabase.*` 와 바인딩된다.
 * 소셜 로그인 토큰 검증(GET /auth/v1/user) 에 사용한다.
 */
@Component
@ConfigurationProperties(prefix = "supabase")
data class SupabaseProperties(
    /** 프로젝트 URL. 예: https://xxxx.supabase.co */
    var url: String = "",

    /** anon(publishable) key. service_role 아님. */
    var anonKey: String = "",
)

package com.knou.api.security

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

/**
 * JWT 관련 설정. application.yml 의 `jwt.*` 와 바인딩된다.
 */
@Component
@ConfigurationProperties(prefix = "jwt")
data class JwtProperties(
    /** HS256 서명 키. 최소 32바이트(256bit) 이상이어야 한다. */
    var secret: String = "",

    /** Access Token 유효 시간(초). */
    var accessTokenValiditySeconds: Long = 3600,
)

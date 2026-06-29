package com.knou.api.security

import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.stereotype.Component

/**
 *
 */
@Component
class StompAuthChannelInterceptor(
    private val tokenProvider: JwtTokenProvider,
) : ChannelInterceptor {

    // TODO : 웹소켓 JWT 인증 구현
}

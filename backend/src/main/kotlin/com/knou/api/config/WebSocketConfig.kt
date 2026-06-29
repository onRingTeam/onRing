package com.knou.api.config

import com.knou.api.security.StompAuthChannelInterceptor
import com.knou.api.utils.ActiveProfileProvider
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

/**
 * STOMP over WebSocket 설정.
 *
 * - 핸드셰이크 엔드포인트: `/ws`
 *   - raw WebSocket (RN 앱용) + SockJS 폴백(브라우저용) 둘 다 등록
 * - 메시지 브로커(인메모리 SimpleBroker): `/topic`(방 브로드캐스트), `/queue`(개인)
 * - 클라이언트 발행 prefix: `/app` (→ @MessageMapping)
 * - 개인 수신 prefix: `/user` (→ 추후 수신자 언어별 번역 전송 Phase 4-2)
 *
 * - CONNECT 프레임 JWT 검증: [StompAuthChannelInterceptor] (운영=필수, dev/local=익명 허용)
 *
 * TODO 확장 시: 인메모리 SimpleBroker → 외부 브로커(RabbitMQ/Redis relay) 전환 (다중 인스턴스)
 */
@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig(
    private val stompAuthChannelInterceptor: StompAuthChannelInterceptor,
) : WebSocketMessageBrokerConfigurer {

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        // 앱(React Native): raw WebSocket
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*")
        // 웹(브라우저 테스트 페이지): SockJS 폴백
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS()
    }

    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        registry.enableSimpleBroker("/topic", "/queue")
        registry.setApplicationDestinationPrefixes("/app")
        registry.setUserDestinationPrefix("/user")
    }

    /** 클라이언트 → 서버 인바운드 채널에 JWT 검증 인터셉터 등록 (CONNECT 시점 인증). */
    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        if (ActiveProfileProvider.isProd()) {
            registration.interceptors(stompAuthChannelInterceptor)
        }
    }
}

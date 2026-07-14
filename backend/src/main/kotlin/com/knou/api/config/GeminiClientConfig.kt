package com.knou.api.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestClient

/**
 * Gemini generateContent 호출용 [RestClient] 구성.
 *
 * baseUrl·연결/읽기 타임아웃을 [GeminiProperties] 로 세팅해 빈으로 노출한다.
 * RestClient 를 빈으로 분리해 [com.knou.api.client.GeminiClient] 가 주입받게 하면,
 * 테스트에서 MockRestServiceServer 를 바인딩한 RestClient 로 손쉽게 대체할 수 있다.
 */
@Configuration
class GeminiClientConfig {

    @Bean
    fun geminiRestClient(props: GeminiProperties): RestClient =
        RestClient.builder()
            .baseUrl("https://generativelanguage.googleapis.com/v1beta")
            .requestFactory(
                SimpleClientHttpRequestFactory().apply {
                    setConnectTimeout(props.connectTimeoutMs.toInt())
                    setReadTimeout(props.readTimeoutMs.toInt())
                },
            )
            .build()
}

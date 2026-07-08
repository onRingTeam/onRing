package com.knou.api.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

/**
 * Gemini(회의 종료 후 AI 요약) 설정. application.yml 의 `gemini.*` 와 바인딩된다.
 * apiKey 가 비어있으면 요약을 생략한다(회의 종료 흐름에는 영향 없음).
 */
@Component
@ConfigurationProperties(prefix = "gemini")
data class GeminiProperties(
    /** Google AI Studio 발급 API 키. 비어있으면 요약 생략. */
    var apiKey: String = "",

    /** 사용 모델. 경량 기본값. */
    var model: String = "gemini-2.5-flash-lite",

    /** 연결 타임아웃(ms). */
    var connectTimeoutMs: Long = 10_000,

    /** 응답 대기 타임아웃(ms). LLM 생성 시간 고려. */
    var readTimeoutMs: Long = 60_000,
)

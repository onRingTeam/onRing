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

    /**
     * 주 모델이 과부하(503)로 소진되면 1회 시도할 폴백 모델.
     * 빈 문자열이거나 주 모델과 같으면 폴백을 생략한다.
     * 특정 버전 고정은 제공 종료 시 404 가 나므로(구 gemini-2.5-flash) 롤링 alias 기본값.
     */
    var fallbackModel: String = "gemini-flash-latest",

    /** 주 모델 최대 시도 횟수(최초 1 + 재시도). 재시도 가능한 오류(503/429/5xx·타임아웃)에만 적용. */
    var maxAttempts: Int = 3,

    /** 지수 백오프 기준 대기(ms). n번째 재시도 전 retryBackoffMs * 2^(n-1) + 지터 만큼 대기. */
    var retryBackoffMs: Long = 2_000,

    /** 연결 타임아웃(ms). */
    var connectTimeoutMs: Long = 10_000,

    /** 응답 대기 타임아웃(ms). LLM 생성 시간 고려. */
    var readTimeoutMs: Long = 60_000,
)

package com.knou.api.service

import com.knou.api.client.GeminiClient
import com.knou.api.dto.common.Language
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

/**
 * 단일 텍스트 번역(온디맨드). 종료 회의 상세 '전체 대화' 탭에서 메시지 개별 번역에 사용한다.
 * 번역은 [GeminiClient] 가 수행하며 재시도/폴백 회복력을 그대로 재사용한다.
 */
@Service
class TranslationService(
    private val geminiClient: GeminiClient,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * [text] 를 [targetLang] 로 번역해 반환한다.
     *
     * @throws ResponseStatusException 503(GEMINI_API_KEY 미설정), 502(번역 호출 실패)
     */
    fun translate(text: String, targetLang: Language): String {
        if (!geminiClient.isConfigured()) {
            throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "번역 기능이 설정되지 않았습니다.")
        }
        return try {
            geminiClient.translate(text, targetLang)
        } catch (e: Exception) {
            log.warn("[translate] {} 번역 실패: {}", targetLang, e.message)
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "번역에 실패했습니다.")
        }
    }
}

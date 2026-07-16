package com.knou.api.service

import com.knou.api.client.GeminiClient
import com.knou.api.dto.common.Language
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class TranslationServiceTest {

    private val geminiClient = mock<GeminiClient>()
    private val service = TranslationService(geminiClient)

    @Test
    fun `translate - Gemini 번역 결과 반환`() {
        whenever(geminiClient.isConfigured()).thenReturn(true)
        whenever(geminiClient.translate("안녕하세요", Language.EN)).thenReturn("Hello")

        assertEquals("Hello", service.translate("안녕하세요", Language.EN))
    }

    @Test
    fun `translate - apiKey 미설정이면 503`() {
        whenever(geminiClient.isConfigured()).thenReturn(false)

        val e = assertFailsWith<ResponseStatusException> {
            service.translate("안녕하세요", Language.EN)
        }
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, e.statusCode)
    }

    @Test
    fun `translate - Gemini 호출 실패면 502`() {
        whenever(geminiClient.isConfigured()).thenReturn(true)
        whenever(geminiClient.translate("안녕하세요", Language.EN)).thenThrow(RuntimeException("503"))

        val e = assertFailsWith<ResponseStatusException> {
            service.translate("안녕하세요", Language.EN)
        }
        assertEquals(HttpStatus.BAD_GATEWAY, e.statusCode)
    }
}

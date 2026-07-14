package com.knou.api.client

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.knou.api.config.GeminiProperties
import com.knou.api.dto.meeting.MeetingMessageResponse
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.ExpectedCount
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.RestClient
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * [GeminiClient] 재시도/폴백 동작 검증.
 * MockRestServiceServer 를 바인딩한 RestClient 를 주입해 HTTP 응답을 제어한다.
 * 백오프 지연은 retryBackoffMs=0 으로 최소화한다(지터만 남음).
 */
class GeminiClientTest {

    private val objectMapper = jacksonObjectMapper()
    private val baseUrl = "https://generativelanguage.googleapis.com/v1beta"

    private fun urlFor(model: String) = "$baseUrl/models/$model:generateContent"

    private val attendees = listOf(AttendeeInfo(10, "고윤아"))
    private val messages = listOf(
        MeetingMessageResponse(
            messageId = 0, userId = 10, speakerName = "고윤아",
            spokenAt = LocalDateTime.of(2026, 7, 14, 14, 0), original = "안녕하세요", translated = null,
        ),
    )

    /** Gemini 정상 응답 바디(구조화 JSON 을 candidates.content.parts.text 에 담아). */
    private fun successBody(summary: String): String {
        val inner = """{"summary":"$summary","actionItems":[{"userId":10,"actionItem":"API 명세 정리"}]}"""
        return objectMapper.writeValueAsString(
            mapOf("candidates" to listOf(mapOf("content" to mapOf("parts" to listOf(mapOf("text" to inner)))))),
        )
    }

    /** MockRestServiceServer 를 바인딩한 GeminiClient 생성. */
    private fun boundClient(props: GeminiProperties): Pair<GeminiClient, MockRestServiceServer> {
        val builder = RestClient.builder().baseUrl(baseUrl)
        val server = MockRestServiceServer.bindTo(builder).build()
        return GeminiClient(props, objectMapper, builder.build()) to server
    }

    @Test
    fun `503 후 재시도로 성공 - 주 모델 2회 호출`() {
        val props = GeminiProperties(
            apiKey = "test-key", model = "gemini-2.5-flash-lite",
            maxAttempts = 3, retryBackoffMs = 0,
        )
        val (client, server) = boundClient(props)
        server.expect(ExpectedCount.once(), requestTo(urlFor("gemini-2.5-flash-lite")))
            .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE))
        server.expect(ExpectedCount.once(), requestTo(urlFor("gemini-2.5-flash-lite")))
            .andRespond(withSuccess(successBody("재시도 성공 요약"), MediaType.APPLICATION_JSON))

        val result = client.summarizeMeeting(attendees, messages)

        assertEquals("재시도 성공 요약", result.summary)
        server.verify()
    }

    @Test
    fun `주 모델 503 소진 후 폴백 모델로 성공`() {
        val props = GeminiProperties(
            apiKey = "test-key", model = "gemini-2.5-flash-lite",
            fallbackModel = "gemini-2.5-flash", maxAttempts = 2, retryBackoffMs = 0,
        )
        val (client, server) = boundClient(props)
        // 주 모델 2회 모두 503
        server.expect(ExpectedCount.times(2), requestTo(urlFor("gemini-2.5-flash-lite")))
            .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE))
        // 폴백 모델 1회 성공
        server.expect(ExpectedCount.once(), requestTo(urlFor("gemini-2.5-flash")))
            .andRespond(withSuccess(successBody("폴백 요약"), MediaType.APPLICATION_JSON))

        val result = client.summarizeMeeting(attendees, messages)

        assertEquals("폴백 요약", result.summary)
        server.verify()
    }

    @Test
    fun `400 BadRequest 는 재시도-폴백 없이 즉시 실패`() {
        val props = GeminiProperties(
            apiKey = "test-key", model = "gemini-2.5-flash-lite",
            fallbackModel = "gemini-2.5-flash", maxAttempts = 3, retryBackoffMs = 0,
        )
        val (client, server) = boundClient(props)
        // 주 모델 단 1회만 호출돼야 함(재시도·폴백 없음)
        server.expect(ExpectedCount.once(), requestTo(urlFor("gemini-2.5-flash-lite")))
            .andRespond(withStatus(HttpStatus.BAD_REQUEST))

        assertFailsWith<HttpClientErrorException> {
            client.summarizeMeeting(attendees, messages)
        }
        server.verify()
    }
}

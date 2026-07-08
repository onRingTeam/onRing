package com.knou.api.client

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.knou.api.config.GeminiProperties
import com.knou.api.dto.meeting.MeetingMessageResponse
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.body
import java.time.format.DateTimeFormatter

/** 회의 참석자 최소 정보(요약 프롬프트·정합성 기준). */
data class AttendeeInfo(val userId: Long, val name: String)

/** LLM이 생성한 참석자별 액션아이템. userId 로 참석자와 매칭. */
data class ActionItemResult(val userId: Long, val actionItem: String)

/** LLM이 반환하는 구조화 요약 결과. */
data class MeetingSummaryResult(
    val summary: String,
    val actionItems: List<ActionItemResult>,
)

/**
 * Gemini generateContent 호출 전담 클라이언트.
 * 프롬프트 조립 → REST 호출 → 구조화 JSON 파싱까지 캡슐화한다.
 *
 * 응답 형식을 `responseSchema` 로 강제해 {summary, actionItems:[{userId, actionItem}]} 만 받는다.
 */
@Component
class GeminiClient(
    private val props: GeminiProperties,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val restClient: RestClient = RestClient.builder()
        .baseUrl("https://generativelanguage.googleapis.com/v1beta")
        .requestFactory(
            SimpleClientHttpRequestFactory().apply {
                setConnectTimeout(props.connectTimeoutMs.toInt())
                setReadTimeout(props.readTimeoutMs.toInt())
            },
        )
        .build()

    /** apiKey 설정 여부. 리스너가 호출 전 확인해 미설정 시 요약을 생략한다. */
    fun isConfigured(): Boolean = props.apiKey.isNotBlank()

    /**
     * 회의 채팅을 요약하고 참석자별 액션아이템을 생성한다.
     *
     * @throws IllegalStateException apiKey 미설정 또는 응답이 비어있음
     * @throws org.springframework.web.client.RestClientException 호출 실패
     */
    fun summarizeMeeting(
        attendees: List<AttendeeInfo>,
        messages: List<MeetingMessageResponse>,
    ): MeetingSummaryResult {
        check(props.apiKey.isNotBlank()) { "GEMINI_API_KEY 미설정" }

        val prompt = buildPrompt(attendees, messages)
        val requestBody = mapOf(
            "contents" to listOf(mapOf("parts" to listOf(mapOf("text" to prompt)))),
            "generationConfig" to mapOf(
                "temperature" to 0.3,
                "responseMimeType" to "application/json",
                "responseSchema" to RESPONSE_SCHEMA,
            ),
        )

        val response = restClient.post()
            .uri("/models/{model}:generateContent", props.model)
            .header("x-goog-api-key", props.apiKey)
            .contentType(MediaType.APPLICATION_JSON)
            .body(requestBody)
            .retrieve()
            .body<GeminiResponse>()

        val json = response?.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
            ?: throw IllegalStateException("Gemini 응답이 비어있습니다.")

        return objectMapper.readValue(json)
    }

    /** 한국어 회의 요약 프롬프트 조립. 회의 제목은 요약 편향을 막기 위해 프롬프트에서 제외한다(대화 내용만으로 요약). */
    private fun buildPrompt(
        attendees: List<AttendeeInfo>,
        messages: List<MeetingMessageResponse>,
    ): String {
        val attendeeList = attendees.joinToString("\n") { "- ${it.userId} — ${it.name}" }
        val transcript = messages.joinToString("\n") { m ->
            "[${m.spokenAt.format(TIME_FMT)}] ${m.speakerName}: ${m.original}"
        }
        return """
            당신은 다국어 회의 기록을 정리하는 어시스턴트입니다. 아래 회의 대화를 읽고 JSON 으로만 답하세요.

            참석자 (userId — 이름):
            $attendeeList

            지침:
            1. summary: 회의 전체 내용을 한국어 3~6문장의 평문으로 요약하세요. 마크다운(#, *, - 등)을 쓰지 마세요.
            2. actionItems: 각 참석자별로 이 회의에서 맡게 된 할 일을 정확히 1건씩 작성하세요. 할 일이 명확하지 않은 참석자는 목록에서 생략하세요.
            3. actionItems 의 userId 는 반드시 위 참석자 목록의 userId 값만 사용하세요. 목록에 없는 값이나 이름을 만들지 마세요.

            대화 기록 (시간순):
            $transcript
        """.trimIndent()
    }

    /** Gemini 응답의 필요한 부분만 매핑. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    private data class GeminiResponse(val candidates: List<Candidate>? = null) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        data class Candidate(val content: Content? = null)

        @JsonIgnoreProperties(ignoreUnknown = true)
        data class Content(val parts: List<Part>? = null)

        @JsonIgnoreProperties(ignoreUnknown = true)
        data class Part(val text: String? = null)
    }

    private companion object {
        val TIME_FMT: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

        /** 구조화 출력 스키마 (Gemini responseSchema — 타입은 대문자). */
        val RESPONSE_SCHEMA = mapOf(
            "type" to "OBJECT",
            "properties" to mapOf(
                "summary" to mapOf("type" to "STRING"),
                "actionItems" to mapOf(
                    "type" to "ARRAY",
                    "items" to mapOf(
                        "type" to "OBJECT",
                        "properties" to mapOf(
                            "userId" to mapOf("type" to "INTEGER"),
                            "actionItem" to mapOf("type" to "STRING"),
                        ),
                        "required" to listOf("userId", "actionItem"),
                    ),
                ),
            ),
            "required" to listOf("summary", "actionItems"),
        )
    }
}

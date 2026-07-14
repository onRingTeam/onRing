package com.knou.api.client

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.knou.api.config.GeminiProperties
import com.knou.api.dto.common.Language
import com.knou.api.dto.meeting.MeetingMessageResponse
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.HttpServerErrorException
import org.springframework.web.client.ResourceAccessException
import org.springframework.web.client.RestClient
import org.springframework.web.client.body
import java.time.format.DateTimeFormatter
import kotlin.random.Random

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
    /** Gemini 전용 RestClient. [com.knou.api.config.GeminiClientConfig] 가 baseUrl·타임아웃을 구성해 주입한다. */
    private val restClient: RestClient,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** apiKey 설정 여부. 리스너가 호출 전 확인해 미설정 시 요약을 생략한다. */
    fun isConfigured(): Boolean = props.apiKey.isNotBlank()

    /**
     * 회의 채팅을 요약하고 참석자별 액션아이템을 생성한다.
     *
     * 주 모델([GeminiProperties.model])로 [GeminiProperties.maxAttempts] 회까지 재시도하되,
     * **재시도 가능한 오류**(503/429/5xx·I/O 타임아웃)에만 지수 백오프 + 지터로 대기한다.
     * 그래도 실패하면 [GeminiProperties.fallbackModel] 로 1회 폴백한다(설정돼 있고 주 모델과 다를 때).
     *
     * @throws IllegalStateException apiKey 미설정 또는 응답이 비어있음
     * @throws org.springframework.web.client.RestClientException 모든 시도·폴백 실패
     */
    fun summarizeMeeting(
        attendees: List<AttendeeInfo>,
        messages: List<MeetingMessageResponse>,
    ): MeetingSummaryResult {
        val prompt = buildPrompt(attendees, messages)
        val requestBody = mapOf(
            "contents" to listOf(mapOf("parts" to listOf(mapOf("text" to prompt)))),
            "generationConfig" to mapOf(
                "temperature" to 0.3,
                "responseMimeType" to "application/json",
                "responseSchema" to RESPONSE_SCHEMA,
            ),
        )
        val json = generateText(requestBody)
        return objectMapper.readValue(json)
    }

    /**
     * 텍스트 한 건을 [targetLang] 로 번역한다(종료 회의 상세 '전체 대화' 탭의 개별 메시지 번역).
     * 요약과 동일한 재시도/폴백 회복력([generateText])을 공유한다.
     *
     * @throws IllegalStateException apiKey 미설정 또는 응답이 비어있음
     * @throws org.springframework.web.client.RestClientException 모든 시도·폴백 실패
     */
    fun translate(text: String, targetLang: Language): String {
        val requestBody = mapOf(
            "contents" to listOf(mapOf("parts" to listOf(mapOf("text" to buildTranslatePrompt(text, targetLang))))),
            "generationConfig" to mapOf(
                "temperature" to 0.0,
                "responseMimeType" to "text/plain",
            ),
        )
        return generateText(requestBody).trim()
    }

    /**
     * 주 모델([GeminiProperties.model])로 [GeminiProperties.maxAttempts] 회까지 재시도(재시도 가능한
     * 오류에만 지수 백오프+지터)하고, 소진 시 [GeminiProperties.fallbackModel] 로 1회 폴백해
     * generateContent 응답의 원시 텍스트를 반환한다. 요약·번역이 공유하는 회복력 실행기.
     */
    private fun generateText(requestBody: Map<String, Any>): String {
        check(props.apiKey.isNotBlank()) { "GEMINI_API_KEY 미설정" }

        // 주 모델 재시도 → 소진 시 폴백 모델 1회.
        val maxAttempts = props.maxAttempts.coerceAtLeast(1)
        var lastError: RuntimeException
        var attempt = 1
        while (true) {
            try {
                return callModel(props.model, requestBody)
            } catch (e: RuntimeException) {
                lastError = e
                // 재시도 불가(4xx 등)면 즉시 중단하고 폴백 판단으로.
                if (!isRetryable(e) || attempt >= maxAttempts) break
                val backoff = backoffMillis(attempt)
                log.warn(
                    "[gemini] 모델 {} {}차 시도 실패({}), {}ms 후 재시도",
                    props.model, attempt, e.message?.take(120), backoff,
                )
                sleep(backoff)
                attempt++
            }
        }

        // 폴백: 설정돼 있고 주 모델과 다르며, 마지막 오류가 재시도 가능(과부하성)한 경우에만.
        val fallback = props.fallbackModel
        if (fallback.isNotBlank() && fallback != props.model && isRetryable(lastError)) {
            log.warn("[gemini] 주 모델 {} 소진, 폴백 모델 {} 로 1회 시도", props.model, fallback)
            return callModel(fallback, requestBody)
        }
        throw lastError
    }

    /** 지정 모델로 generateContent 1회 호출 후 응답의 원시 텍스트를 반환한다. */
    private fun callModel(model: String, requestBody: Map<String, Any>): String {
        val response = restClient.post()
            .uri("/models/{model}:generateContent", model)
            .header("x-goog-api-key", props.apiKey)
            .contentType(MediaType.APPLICATION_JSON)
            .body(requestBody)
            .retrieve()
            .body<GeminiResponse>()

        return response?.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
            ?: throw IllegalStateException("Gemini 응답이 비어있습니다.")
    }

    /**
     * 재시도 가능한 일시적 오류인지 판정.
     * - 503/500 등 5xx 서버 오류([HttpServerErrorException])
     * - 429 요청 과다([HttpClientErrorException.TooManyRequests])
     * - 연결/읽기 타임아웃 등 I/O([ResourceAccessException])
     * 그 외(400·401·403 등 4xx, 응답 파싱 오류)는 재시도해도 무의미하므로 false.
     */
    private fun isRetryable(e: RuntimeException): Boolean = when (e) {
        is HttpServerErrorException -> true
        is HttpClientErrorException.TooManyRequests -> true
        is ResourceAccessException -> true
        else -> false
    }

    /** n차 재시도 전 대기(ms): retryBackoffMs * 2^(n-1) + 0~500ms 지터. */
    private fun backoffMillis(attempt: Int): Long {
        val base = props.retryBackoffMs.coerceAtLeast(0)
        val exp = base shl (attempt - 1) // base * 2^(attempt-1)
        return exp + Random.nextLong(0, 500)
    }

    /** 인터럽트를 보존하는 sleep. */
    private fun sleep(millis: Long) {
        try {
            Thread.sleep(millis)
        } catch (ie: InterruptedException) {
            Thread.currentThread().interrupt()
        }
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

    /** 단일 텍스트 번역 프롬프트. 번역문만 반환하도록 지시(따옴표·설명 배제). */
    private fun buildTranslatePrompt(text: String, targetLang: Language): String {
        val langName = LANG_DISPLAY_NAME[targetLang] ?: targetLang.name
        return """
            다음 텍스트를 $langName 로 자연스럽게 번역하세요.
            번역문만 출력하고 따옴표, 설명, 부가 문구는 넣지 마세요. 이미 $langName 이면 원문을 그대로 반환하세요.

            텍스트:
            $text
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

        /** 번역 프롬프트에 넣을 대상 언어 표기(모델이 잘 인식하도록 각 언어 자국어명). */
        val LANG_DISPLAY_NAME = mapOf(
            Language.KO to "한국어",
            Language.EN to "English",
            Language.JA to "日本語",
            Language.ZH to "中文",
        )

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

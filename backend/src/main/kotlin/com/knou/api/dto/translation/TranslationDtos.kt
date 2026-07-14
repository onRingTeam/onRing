package com.knou.api.dto.translation

import com.knou.api.dto.common.Language
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/** 단일 텍스트 번역 요청 (종료 회의 상세 '전체 대화' 탭의 메시지 개별 번역). */
@Schema(description = "텍스트 번역 요청")
data class TranslateRequest(
    @field:Schema(description = "번역할 원문", example = "안녕하세요")
    @field:NotBlank
    @field:Size(max = 2000)
    val text: String,

    @field:Schema(description = "대상 언어 (조회자 설정 언어)")
    val targetLang: Language,
)

/** 번역 결과. */
@Schema(description = "텍스트 번역 응답")
data class TranslateResponse(
    @field:Schema(description = "번역문", example = "Hello")
    val translatedText: String,
)

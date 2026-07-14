package com.knou.api.controller

import com.knou.api.dto.translation.TranslateRequest
import com.knou.api.dto.translation.TranslateResponse
import com.knou.api.service.TranslationService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 텍스트 번역 API. 종료 회의 상세 '전체 대화' 탭에서 메시지 개별 번역(조회자 설정 언어)에 사용한다.
 *
 * NOTE: 인증 도입 전까지 현재 사용자는 `X-User-Id` 헤더로 식별한다. (TODO: JWT 적용)
 */
@Tag(name = "Translation", description = "텍스트 번역")
@RestController
@RequestMapping("/api/translations")
class TranslationController(
    private val translationService: TranslationService,
) {

    @Operation(summary = "텍스트 번역", description = "원문을 대상 언어(조회자 설정 언어)로 번역한다. (화면 4-d)")
    @PostMapping
    fun translate(
        @RequestHeader("X-User-Id") userId: Long,
        @Valid @RequestBody request: TranslateRequest,
    ): ResponseEntity<TranslateResponse> {
        val translated = translationService.translate(request.text, request.targetLang)
        return ResponseEntity.ok(TranslateResponse(translated))
    }
}

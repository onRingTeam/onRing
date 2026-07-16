package com.knou.api.dto.common

import io.swagger.v3.oas.annotations.media.Schema

/** 공통 페이지 응답 래퍼. */
@Schema(description = "페이지 응답")
data class PageResponse<T>(
    @field:Schema(description = "현재 페이지 (0-base)", example = "0")
    val page: Int,

    @field:Schema(description = "페이지 크기", example = "20")
    val size: Int,

    @field:Schema(description = "전체 건수", example = "37")
    val totalElements: Long,

    @field:Schema(description = "전체 페이지 수", example = "2")
    val totalPages: Int,

    @field:Schema(description = "현재 페이지 데이터")
    val content: List<T>,
)

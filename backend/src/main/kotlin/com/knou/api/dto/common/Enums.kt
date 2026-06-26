package com.knou.api.dto.common

import io.swagger.v3.oas.annotations.media.Schema

/** 지원 언어 (채팅 설정 / 회의 언어). 화면정의서 6-c-ⅱ */
@Schema(description = "지원 언어 코드")
enum class Language {
    @Schema(description = "한국어") KO,
    @Schema(description = "일본어") JA,
    @Schema(description = "중국어") ZH,
    @Schema(description = "영어") EN,
}

/** 글씨 크기. 화면정의서 6-c-ⅲ */
@Schema(description = "글씨 크기")
enum class FontSize {
    @Schema(description = "작게") SMALL,
    @Schema(description = "보통") MEDIUM,
    @Schema(description = "크게") LARGE,
    @Schema(description = "매우 크게") XLARGE,
}

/** 회의 상태. */
@Schema(description = "회의 상태")
enum class MeetingStatus {
    @Schema(description = "진행중") IN_PROGRESS,
    @Schema(description = "종료") ENDED,
}

/** 내보내기 파일 형식. 화면정의서 4-c-ⅲ */
@Schema(description = "내보내기 파일 형식")
enum class ExportFormat {
    @Schema(description = "PDF — 수정 불가, 인쇄·공유용") PDF,
    @Schema(description = "TXT — 수정 가능, 원문") TXT,
}

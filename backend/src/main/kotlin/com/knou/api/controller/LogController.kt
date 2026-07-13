package com.knou.api.controller

import com.knou.api.logging.LogBuffer
import com.knou.api.logging.LogStreamService
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseBody
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * 서버 실시간 로그 뷰어 (관리용).
 *
 * 접근 제어: IP 화이트리스트 — [com.knou.api.config.LogAccessFilterConfig] 가
 * /admin/logs 하위 전체에 대해 (전역 화이트리스트 임시해제와 무관하게) 항상 검사한다.
 *
 *  - GET /admin/logs          : 뷰어 페이지 (templates/logs.html)
 *  - GET /admin/logs/recent   : 최근 로그 (기본·최대 1,000줄, JSON 배열)
 *  - GET /admin/logs/stream   : 실시간 스트림 (SSE)
 *  - GET /admin/logs/download : 최근 10,000줄 파일 다운로드
 */
@Controller
@RequestMapping("/admin/logs")
class LogController(private val logStreamService: LogStreamService) {

    @GetMapping
    fun page(): String = "logs"

    /** 최근 로그. 한 항목이 여러 줄(스택트레이스)일 수 있어 JSON 배열로 내려준다. */
    @GetMapping("/recent")
    @ResponseBody
    fun recent(@RequestParam(defaultValue = "1000") lines: Int): List<String> =
        LogBuffer.tail(lines.coerceIn(1, VIEW_MAX_LINES))

    @GetMapping("/stream")
    fun stream(): SseEmitter = logStreamService.subscribe()

    @GetMapping("/download")
    fun download(): ResponseEntity<ByteArray> {
        val body = LogBuffer.tail(LogBuffer.CAPACITY).joinToString("\n").toByteArray(Charsets.UTF_8)
        val stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"))
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"knou-logs-$stamp.log\"")
            .contentType(MediaType.TEXT_PLAIN)
            .body(body)
    }

    companion object {
        /** 뷰어 초기 로드 상한 (브라우저 렌더링 보호). 다운로드는 [LogBuffer.CAPACITY]. */
        private const val VIEW_MAX_LINES = 1_000
    }
}

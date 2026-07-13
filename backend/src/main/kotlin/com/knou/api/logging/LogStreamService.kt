package com.knou.api.logging

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.annotation.PreDestroy
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.nio.charset.StandardCharsets
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * 로그 실시간 스트리밍 (SSE).
 *
 * [LogBuffer] 리스너로 새 로그를 받아 구독 중인 브라우저 전부에 밀어준다.
 * 로그 한 건이 스택트레이스로 여러 줄일 수 있어 SSE 프레임 깨짐 방지를 위해
 * JSON 문자열(한 줄)로 인코딩해 보낸다 — 클라이언트는 JSON.parse.
 *
 * Cloudflare 터널이 유휴 연결을 끊으므로(≈100초) 25초마다 하트비트 코멘트를 보낸다.
 * ⚠️ 이 클래스 안에서 로깅 금지 — 전송 자체가 로그를 만들면 무한 루프.
 */
@Service
class LogStreamService(private val objectMapper: ObjectMapper) {

    private val emitters = CopyOnWriteArrayList<SseEmitter>()

    private val listener: (String) -> Unit = { entry ->
        val payload = objectMapper.writeValueAsString(entry)
        for (emitter in emitters) {
            try {
                // charset 명시 필수 — 기본(StringHttpMessageConverter)은 ISO-8859-1 이라 한글이 깨진다
                emitter.send(SseEmitter.event().data(payload, TEXT_UTF8))
            } catch (_: Throwable) {
                emitters.remove(emitter)
            }
        }
    }

    private val heartbeat = Executors.newSingleThreadScheduledExecutor { r ->
        Thread(r, "log-sse-heartbeat").apply { isDaemon = true }
    }.also {
        it.scheduleAtFixedRate({
            for (emitter in emitters) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"))
                } catch (_: Throwable) {
                    emitters.remove(emitter)
                }
            }
        }, 25, 25, TimeUnit.SECONDS)
    }

    init {
        LogBuffer.addListener(listener)
    }

    /** 새 구독 시작. 타임아웃 없음 — 종료는 클라이언트 이탈/전송 실패로 감지. */
    fun subscribe(): SseEmitter {
        val emitter = SseEmitter(0L)
        emitter.onCompletion { emitters.remove(emitter) }
        emitter.onTimeout { emitters.remove(emitter) }
        emitter.onError { emitters.remove(emitter) }
        emitters.add(emitter)
        return emitter
    }

    companion object {
        private val TEXT_UTF8 = MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8)
    }

    @PreDestroy
    fun shutdown() {
        LogBuffer.removeListener(listener)
        heartbeat.shutdownNow()
        for (emitter in emitters) {
            try {
                emitter.complete()
            } catch (_: Throwable) {
                // ignore
            }
        }
        emitters.clear()
    }
}

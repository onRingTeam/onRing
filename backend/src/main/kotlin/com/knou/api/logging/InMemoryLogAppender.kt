package com.knou.api.logging

import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.LoggerContext
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.classic.spi.ThrowableProxyUtil
import ch.qos.logback.core.AppenderBase
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.CopyOnWriteArrayList

/**
 * 서버 로그 인메모리 링버퍼 (관리용 로그 뷰어의 데이터 소스).
 *
 * 로그는 journald(stdout)로만 나가고 파일이 없으므로, 뷰어(/admin/logs)가 읽을 수 있게
 * 최근 [CAPACITY]줄을 메모리에 유지한다. 실시간 구독자(SSE)에게는 리스너로 즉시 전달.
 *
 * ⚠️ 리스너 안에서 절대 로깅하지 말 것 — appender 가 다시 호출되는 무한 루프가 된다.
 */
object LogBuffer {
    /** 다운로드 상한 (최근 1만 줄). 뷰어 초기 표시는 이 중 최근 1,000줄. */
    const val CAPACITY = 10_000

    private val entries = ArrayDeque<String>(CAPACITY)
    private val listeners = CopyOnWriteArrayList<(String) -> Unit>()

    fun append(entry: String) {
        synchronized(entries) {
            if (entries.size >= CAPACITY) entries.removeFirst()
            entries.addLast(entry)
        }
        for (l in listeners) {
            try {
                l(entry)
            } catch (_: Throwable) {
                // 구독자 실패는 무시 — 로깅 금지(루프 방지)
            }
        }
    }

    /** 최근 n줄 (시간순). */
    fun tail(n: Int): List<String> = synchronized(entries) {
        entries.takeLast(n.coerceIn(0, CAPACITY))
    }

    fun addListener(listener: (String) -> Unit) = listeners.add(listener)
    fun removeListener(listener: (String) -> Unit) = listeners.remove(listener)
}

/**
 * 모든 로그 이벤트를 [LogBuffer] 로 흘려보내는 logback 어펜더.
 * 콘솔(journald) 출력에는 영향 없음 — 루트 로거에 어펜더 하나를 추가할 뿐이다.
 */
class InMemoryLogAppender : AppenderBase<ILoggingEvent>() {

    // 홈서버 시스템 TZ 가 UTC 라 systemDefault 로 찍으면 9시간 어긋나 보인다 — 뷰어는 KST 고정.
    private val ts = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")
    private val zone = ZoneId.of("Asia/Seoul")

    override fun append(event: ILoggingEvent) {
        val sb = StringBuilder(160)
        sb.append(ts.format(Instant.ofEpochMilli(event.timeStamp).atZone(zone)))
            .append(' ').append("%-5s".format(event.level.toString()))
            .append(" [").append(event.threadName).append("] ")
            .append(event.loggerName).append(" - ")
            .append(event.formattedMessage)
        event.throwableProxy?.let { sb.append('\n').append(ThrowableProxyUtil.asString(it)) }
        LogBuffer.append(sb.toString())
    }
}

/** 앱 기동 시 루트 로거에 [InMemoryLogAppender] 를 프로그래밍 방식으로 부착. */
@Component
class LogBufferRegistrar {

    @PostConstruct
    fun attach() {
        val context = LoggerFactory.getILoggerFactory() as LoggerContext
        val root = context.getLogger(Logger.ROOT_LOGGER_NAME)
        if (root.getAppender(APPENDER_NAME) != null) return
        val appender = InMemoryLogAppender().apply {
            this.context = context
            name = APPENDER_NAME
            start()
        }
        root.addAppender(appender)
    }

    companion object {
        private const val APPENDER_NAME = "IN_MEMORY_LOG_BUFFER"
    }
}

package com.knou.api

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableAsync

// @EnableAsync: 회의 종료 후처리(@Async 이벤트 리스너)가 API 응답을 막지 않도록
@EnableAsync
@SpringBootApplication
class KnouApiApplication

fun main(args: Array<String>) {
	runApplication<KnouApiApplication>(*args)
}

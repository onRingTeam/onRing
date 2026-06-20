package com.knou.api

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class KnouApiApplication

fun main(args: Array<String>) {
	runApplication<KnouApiApplication>(*args)
}

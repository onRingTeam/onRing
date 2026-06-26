package com.knou.api.test

import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import java.time.LocalDateTime

@Controller
class TestController {

    /** Thymeleaf 연결 확인용 테스트 페이지. GET /test → templates/test.html */
    @GetMapping("/test")
    fun testPage(model: Model): String {
        model.addAttribute("message", "Thymeleaf 연결 성공!")
        model.addAttribute("now", LocalDateTime.now())
        return "test"
    }

    @GetMapping("/webSocketTest1")
    fun webSocketTestPage1(model: Model): String {
        return "webSocketTest1"
    }

    @GetMapping("/webSocketTest2")
    fun webSocketTestPage2(model: Model): String {
        return "webSocketTest2"
    }
}

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

    /**
     * 회의 진행 화면(웹). 앱이 WebView 로 로드한다.
     * RN WebSocket 의 STOMP NULL 프레임 버그를 우회하려고, 실시간 채팅·자막·참여자 UI 를
     * 브라우저(stompjs + SockJS)에서 구동한다. 파라미터는 쿼리로 전달:
     * `?meetingId=&code=&name=&userId=&host=0|1&token=&lang=ko|en|ja|zh`
     * GET /meeting-room → templates/meeting-room.html
     */
    @GetMapping("/meeting-room")
    fun meetingRoomPage(): String {
        return "meeting-room"
    }
}

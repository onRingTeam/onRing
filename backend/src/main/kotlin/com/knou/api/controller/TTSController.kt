package com.knou.api.controller

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class TTSController {

    @GetMapping("/TTS")
    fun TTSBasic() : ResponseEntity<String>{
        return ResponseEntity.ok("Temp TTS OK");
    }
}
package com.knou.api.controller

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class STTController {

    @GetMapping("/STT")
    fun STTBasic() : ResponseEntity<String>{
        return ResponseEntity.ok("Temp STT OK");
    }
}
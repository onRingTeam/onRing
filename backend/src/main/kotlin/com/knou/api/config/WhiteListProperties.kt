package com.knou.api.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

@Component
@ConfigurationProperties(prefix = "whitelist")
data class WhiteListProperties(
    var allowedIps: List<String> = emptyList()
)
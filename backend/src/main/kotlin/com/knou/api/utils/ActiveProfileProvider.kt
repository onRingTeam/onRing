package com.knou.api.utils

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

@Component
class ActiveProfileProvider(
    @Value("\${spring.profiles.active:local}")
    private val profile: String
) {
    init {
        activeProfile = profile
    }
    fun getProfile(): String = profile

    companion object {
        private lateinit var activeProfile: String
        const val LOCAL = "local"
        const val DEV = "dev"
        const val PROD = "prod"

        fun isLocal(): Boolean = ::activeProfile.isInitialized && activeProfile == LOCAL
        fun isDev(): Boolean = ::activeProfile.isInitialized && activeProfile == DEV
        fun isProd(): Boolean = ::activeProfile.isInitialized && activeProfile == PROD
    }
}
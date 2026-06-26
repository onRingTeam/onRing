package com.knou.api.config

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Contact
import io.swagger.v3.oas.models.info.Info
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Swagger / OpenAPI 문서 설정.
 *
 * - Swagger UI : http://localhost:8080/swagger-ui.html
 * - OpenAPI JSON : http://localhost:8080/v3/api-docs
 */
@Configuration
class OpenApiConfig {

    @Bean
    fun onRingOpenAPI(): OpenAPI = OpenAPI()
        .info(
            Info()
                .title("OnRing API")
                .description("언어의 장벽을 끄고, 소통의 링을 켜다 — OnRing 백엔드 API 명세서")
                .version("v1.1")
                .contact(Contact().name("뭐먹Team")),
        )
}

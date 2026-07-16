package com.knou.api.security

import io.jsonwebtoken.Claims
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.util.Date
import javax.crypto.SecretKey

/**
 * JWT 생성/검증 유틸. (HS256)
 *
 * 현재 범위는 "검증"이며, [createToken] 은 필터 동작 확인·추후 로그인 발급에 쓰도록 함께 둔다.
 */
@Component
class JwtTokenProvider(
    private val properties: JwtProperties,
) {
    private val key: SecretKey =
        Keys.hmacShaKeyFor(properties.secret.toByteArray(StandardCharsets.UTF_8))

    /** userId 를 subject 로 하는 Access Token 발급. */
    fun createToken(userId: Long): String {
        val now = Date()
        val expiry = Date(now.time + properties.accessTokenValiditySeconds * 1000)
        return Jwts.builder()
            .subject(userId.toString())
            .issuedAt(now)
            .expiration(expiry)
            .signWith(key)
            .compact()
    }

    /**
     * 토큰을 검증하고 Claims 를 반환한다.
     * 서명 불일치·만료·형식 오류 시 [JwtException] 을 던진다.
     */
    fun parse(token: String): Claims =
        Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload

    /** 토큰에서 userId(subject) 추출. */
    fun getUserId(token: String): Long = parse(token).subject.toLong()
}

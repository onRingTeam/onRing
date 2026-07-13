package com.knou.api.config

import jakarta.servlet.Filter
import jakarta.servlet.FilterChain
import jakarta.servlet.ServletRequest
import jakarta.servlet.ServletResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.net.InetAddress

/**
 * 로그 뷰어(/admin/logs 하위 전체) 전용 IP 화이트리스트 필터.
 *
 * 전역 필터([FilterConfig])는 현재 화이트리스트가 임시해제(전체 허용) 상태지만,
 * 서버 로그는 민감 정보라 여기서는 프로파일과 무관하게 **항상** 실제 화이트리스트를 검사한다.
 * 루프백(127.0.0.1/::1)은 항상 허용 — 로컬 개발·홈서버 셸에서의 확인용.
 *
 * IP 매칭 로직은 [FilterConfig] 의 원본(주석 처리된 isAllowed)과 동일 —
 * 단일 IP 와 CIDR 대역("2406:5900:112d:6083::/64") 둘 다 지원.
 */
@Configuration
class LogAccessFilterConfig(
    private val whiteListProperties: WhiteListProperties,
) {

    private val log = LoggerFactory.getLogger(LogAccessFilterConfig::class.java)

    @Bean
    fun logAccessIpFilter(): FilterRegistrationBean<Filter> {
        val registration = FilterRegistrationBean<Filter>()

        registration.filter = object : Filter {
            override fun doFilter(request: ServletRequest, response: ServletResponse, chain: FilterChain) {
                val req = request as HttpServletRequest
                val res = response as HttpServletResponse

                val ip = clientIp(req)
                if (isAllowed(ip)) {
                    chain.doFilter(request, response)
                } else {
                    log.warn("[log-viewer] 접근 거부 ip={} uri={}", ip, req.requestURI)
                    res.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied")
                }
            }

            // Cloudflare가 실제 클라이언트 IP를 CF-Connecting-IP에 넣어준다.
            // 터널을 거치지 않은 로컬 접근 등은 remoteAddr로 폴백.
            private fun clientIp(req: HttpServletRequest): String {
                req.getHeader("CF-Connecting-IP")?.takeIf { it.isNotBlank() }?.let { return it.trim() }
                req.getHeader("X-Forwarded-For")?.takeIf { it.isNotBlank() }
                    ?.let { return it.split(",").first().trim() }
                return req.remoteAddr
            }

            private fun isAllowed(ip: String): Boolean {
                if (isLoopback(ip)) return true
                return whiteListProperties.allowedIps.any { entry -> ipMatches(ip, entry) }
            }

            private fun isLoopback(ip: String): Boolean = try {
                InetAddress.getByName(ip).isLoopbackAddress
            } catch (e: Exception) {
                false
            }

            private fun ipMatches(ip: String, entry: String): Boolean = try {
                if (entry.contains("/")) {
                    val (network, prefixStr) = entry.split("/", limit = 2)
                    cidrContains(network.trim(), prefixStr.trim().toInt(), ip)
                } else {
                    // 표기 차이(예: ::1 vs 0:0:0:0:0:0:0:1)까지 같게 보도록 InetAddress 로 정규화 비교
                    InetAddress.getByName(entry) == InetAddress.getByName(ip)
                }
            } catch (e: Exception) {
                log.warn("화이트리스트 항목 매칭 실패 entry={} ip={} : {}", entry, ip, e.message)
                false
            }

            // ip 가 network/prefix 대역에 속하는지 (IPv4·IPv6 공통, 바이트 단위 prefix 비교)
            private fun cidrContains(network: String, prefix: Int, ip: String): Boolean {
                val netBytes = InetAddress.getByName(network).address
                val ipBytes = InetAddress.getByName(ip).address
                if (netBytes.size != ipBytes.size) return false   // v4 vs v6 불일치
                var bitsLeft = prefix
                for (i in ipBytes.indices) {
                    if (bitsLeft <= 0) break
                    val mask = if (bitsLeft >= 8) 0xFF else (0xFF shl (8 - bitsLeft)) and 0xFF
                    if ((ipBytes[i].toInt() and mask) != (netBytes[i].toInt() and mask)) return false
                    bitsLeft -= 8
                }
                return true
            }
        }

        registration.addUrlPatterns("/admin/logs", "/admin/logs/*")
        registration.order = 0  // 전역 IP 필터(order=1)보다 먼저
        return registration
    }
}

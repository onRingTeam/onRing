package com.knou.api.config

import com.knou.api.utils.ActiveProfileProvider
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.boot.web.servlet.FilterRegistrationBean
import jakarta.servlet.Filter
import jakarta.servlet.FilterChain
import jakarta.servlet.ServletRequest
import jakarta.servlet.ServletResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import java.io.IOException
import java.net.InetAddress

@Configuration
class FilterConfig(
    private val whiteListProperties: WhiteListProperties
) {

    private val log = LoggerFactory.getLogger(FilterConfig::class.java)

    @Bean
    fun ipRestrictionFilter(): FilterRegistrationBean<Filter> {
        val registration = FilterRegistrationBean<Filter>()

        registration.filter = object : Filter {
            @Throws(IOException::class)
            override fun doFilter(
                request: ServletRequest,
                response: ServletResponse,
                chain: FilterChain
            ) {
                val req = request as HttpServletRequest
                val res = response as HttpServletResponse

                if (!ActiveProfileProvider.isDev()) {
                    chain.doFilter(request, response)
                    return
                }

                val ip = clientIp(req)
                if (isAllowed(ip)) {
                    chain.doFilter(request, response)
                } else {
                    log.warn("Access denied for ip={} uri={} (allowed={})", ip, req.requestURI, whiteListProperties.allowedIps)
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

            // 화이트리스트 항목은 단일 IP("1.2.3.4", "::1") 또는 CIDR 대역("2406:5900:112d:6083::/64") 둘 다 허용.
            //private fun isAllowed(ip: String): Boolean =
            //    whiteListProperties.allowedIps.any { entry -> ipMatches(ip, entry) }
            private fun isAllowed(ip: String): Boolean = true;
            
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

        registration.addUrlPatterns("/*")
        registration.order = 1
        return registration
    }
}
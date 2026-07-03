package com.knou.api.service

import com.knou.api.dto.common.FontSize
import com.knou.api.dto.common.Language
import com.knou.api.dto.user.UpdateChatSettingsRequest
import com.knou.api.dto.user.UpdateProfileRequest
import com.knou.api.dto.user.UserProfileResponse
import com.knou.api.entity.UserEntity
import com.knou.api.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

/** 구독/잔여횟수 등 스키마 미반영 필드의 임시 기본값. (구독 정책 구현 전) */
private const val DEFAULT_REMAINING_COUNT = 3

/**
 * 회원 프로필 / 채팅 설정 비즈니스 로직. (화면정의서 6)
 */
@Service
class UserService(
    private val userRepository: UserRepository,
) {

    /**
     * 내 프로필 + 채팅 설정 조회. (화면정의서 6-a, 6-c)
     *
     * NOTE: social/subscribed/remainingCount 는 아직 스키마에 없어 기본값으로 반환한다.
     *
     * @throws ResponseStatusException 404(사용자 없음)
     */
    @Transactional(readOnly = true)
    fun getProfile(userId: Long): UserProfileResponse {
        val user = findUser(userId)
        return UserProfileResponse(
            userId = user.userId!!,
            email = user.email,
            name = user.name,
            social = false,
            subscribed = false,
            remainingCount = DEFAULT_REMAINING_COUNT,
            language = parseLanguage(user.language),
            fontSize = parseFontSize(user.fontSize),
            vibration = user.vibrationYn == "Y",
        )
    }

    /**
     * 프로필(회원명) 수정. (화면정의서 6-a-i)
     *
     * @throws ResponseStatusException 404(사용자 없음)
     */
    @Transactional
    fun updateProfile(userId: Long, request: UpdateProfileRequest) {
        val user = findUser(userId)
        user.name = request.name
    }

    /**
     * 채팅 설정(언어 / 글씨 크기 / 진동) 수정. (화면정의서 6-c)
     *
     * @throws ResponseStatusException 404(사용자 없음)
     */
    @Transactional
    fun updateChatSettings(userId: Long, request: UpdateChatSettingsRequest) {
        val user = findUser(userId)
        user.language = request.language.name
        user.fontSize = request.fontSize.name
        user.vibrationYn = if (request.vibration) "Y" else "N"
    }

    private fun findUser(userId: Long): UserEntity =
        userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다: $userId")
        }

    /** 저장 문자열 → Language enum (미상값은 KO 기본). */
    private fun parseLanguage(value: String): Language =
        runCatching { Language.valueOf(value) }.getOrDefault(Language.KO)

    /** 저장 문자열 → FontSize enum (미상값은 MEDIUM 기본). */
    private fun parseFontSize(value: String): FontSize =
        runCatching { FontSize.valueOf(value) }.getOrDefault(FontSize.MEDIUM)
}

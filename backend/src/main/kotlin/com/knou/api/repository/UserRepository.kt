package com.knou.api.repository

import com.knou.api.entity.UserEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface UserRepository : JpaRepository<UserEntity, Long> {

    // 이메일로 회원 조회 (없으면 null)
    fun findByEmail(email: String): UserEntity?

    // 이메일 중복 여부
    fun existsByEmail(email: String): Boolean
}

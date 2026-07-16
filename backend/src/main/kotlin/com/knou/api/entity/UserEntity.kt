package com.knou.api.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime

@Entity
@Table(name = "user")
class UserEntity(

    @Column(name = "email", nullable = false, unique = true, length = 255)
    var email: String,

    @Column(name = "name", nullable = false, length = 100)
    var name: String,

    @Column(name = "language", nullable = false, length = 30)
    var language: String,

    @Column(name = "font_size", nullable = false, length = 30)
    var fontSize: String,

    @Column(name = "vibration_yn", nullable = false, length = 1)
    var vibrationYn: String = "N",
) {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    var userId: Long? = null

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime? = null
}

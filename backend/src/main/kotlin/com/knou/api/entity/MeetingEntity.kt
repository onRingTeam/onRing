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
@Table(name = "meeting")
class MeetingEntity(

    @Column(name = "title", nullable = false, length = 200)
    var title: String,

    @Column(name = "meeting_date", nullable = false)
    var meetingDate: LocalDateTime,

    @Column(name = "meeting_code", nullable = false, unique = true, length = 50)
    var meetingCode: String,

    @Column(name = "summary", columnDefinition = "TEXT")
    var summary: String? = null,

    @Column(name = "duration_sec")
    var durationSec: Int? = null,

    @Column(name = "status", nullable = false, length = 20)
    var status: String = "IN_PROGRESS",
) {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "meeting_id")
    var meetingId: Long? = null

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime? = null
}

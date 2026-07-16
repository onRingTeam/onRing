package com.knou.api.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime

@Entity
@Table(
    name = "meeting_attendance",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_attendance_meeting_user", columnNames = ["meeting_id", "user_id"]),
    ],
)
class MeetingAttendanceEntity(

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    var meeting: MeetingEntity,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity,

    @Column(name = "favorite_yn", nullable = false, length = 1)
    var favoriteYn: String = "N",

    @Column(name = "use_yn", nullable = false, length = 1)
    var useYn: String = "Y",

    @Column(name = "action_item", columnDefinition = "TEXT")
    var actionItem: String? = null,

    @Column(name = "speech_count", nullable = false)
    var speechCount: Int = 0,

    @Column(name = "translate_language", length = 30)
    var translateLanguage: String? = null,

    @Column(name = "bm_id")
    var bmId: Long? = null,

    @Column(name = "iscreated", nullable = false, length = 1)
    var isCreated: String = "N",
) {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    var attendanceId: Long? = null

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime? = null
}

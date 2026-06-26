package com.knou.api.repository

import com.knou.api.entity.MeetingEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface MeetingRepository : JpaRepository<MeetingEntity, Long> {

    // 회의 코드로 조회 (unique)
    fun findByMeetingCode(meetingCode: String): MeetingEntity?

    fun existsByMeetingCode(meetingCode: String): Boolean

    // 상태별 회의 목록 (예: "IN_PROGRESS" / "ENDED")
    fun findAllByStatus(status: String): List<MeetingEntity>
}

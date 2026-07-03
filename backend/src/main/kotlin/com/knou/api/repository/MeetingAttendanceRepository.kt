package com.knou.api.repository

import com.knou.api.entity.MeetingAttendanceEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface MeetingAttendanceRepository : JpaRepository<MeetingAttendanceEntity, Long> {

    // 특정 회의의 참석자 목록
    fun findAllByMeeting_MeetingId(meetingId: Long): List<MeetingAttendanceEntity>

    // 특정 회원의 참석 이력
    fun findAllByUser_UserId(userId: Long): List<MeetingAttendanceEntity>

    // 특정 회원의 참석 이력 (회의 날짜 최신순 — 홈 최근 회의/회의록 목록)
    fun findAllByUser_UserIdOrderByMeeting_MeetingDateDesc(userId: Long): List<MeetingAttendanceEntity>

    // 특정 회원의 진행중(IN_PROGRESS 등) 회의 참석 단건 (현재 진행중 회의 조회)
    fun findFirstByUser_UserIdAndMeeting_Status(userId: Long, status: String): MeetingAttendanceEntity?

    // 회의 + 회원으로 단건 조회 (복합 unique)
    fun findByMeeting_MeetingIdAndUser_UserId(meetingId: Long, userId: Long): MeetingAttendanceEntity?

    // 특정 회원의 즐겨찾기한 참석 목록
    fun findAllByUser_UserIdAndFavoriteYn(userId: Long, favoriteYn: String): List<MeetingAttendanceEntity>
}

package com.knou.api.entityTest

import com.knou.api.entity.MeetingAttendanceEntity
import com.knou.api.entity.MeetingEntity
import com.knou.api.entity.UserEntity
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertNull

class EntityTest {

    @Test
    @DisplayName("UserEntity 생성")
    fun createUserEntity() {
        val user = UserEntity(
            email = "test@knou.ac.kr",
            name = "홍길동",
            language = "KO",
            fontSize = "MEDIUM",
        )

        assertNull(user.userId)
        assertEquals("test@knou.ac.kr", user.email)
        assertEquals("홍길동", user.name)
        assertEquals("N", user.vibrationYn) // 기본값
    }

    @Test
    @DisplayName("MeetingEntity 생성")
    fun createMeetingEntity() {
        val meeting = MeetingEntity(
            title = "정기 회의",
            meetingDate = LocalDateTime.now(),
            meetingCode = "MTG-0001",
        )

        assertNull(meeting.meetingId)
        assertEquals("정기 회의", meeting.title)
        assertEquals("MTG-0001", meeting.meetingCode)
        assertEquals("IN_PROGRESS", meeting.status) // 기본값
    }

    @Test
    @DisplayName("MeetingAttendanceEntity 생성 - 연관관계 매핑")
    fun createMeetingAttendanceEntity() {
        val user = UserEntity(
            email = "test@knou.ac.kr",
            name = "홍길동",
            language = "KO",
            fontSize = "MEDIUM",
        )
        val meeting = MeetingEntity(
            title = "정기 회의",
            meetingDate = LocalDateTime.now(),
            meetingCode = "MTG-0001",
        )

        val attendance = MeetingAttendanceEntity(
            meeting = meeting,
            user = user,
        )


        assertNull(attendance.attendanceId)
        assertEquals(meeting, attendance.meeting)
        assertEquals(user, attendance.user)
        assertEquals("N", attendance.favoriteYn) // 기본값
        assertEquals(0, attendance.speechCount)   // 기본값
    }
}

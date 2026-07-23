package com.knou.api.entityTest

import com.knou.api.entity.MeetingAttendanceEntity
import com.knou.api.entity.MeetingEntity
import com.knou.api.entity.UserEntity
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

/**
 * JPA가 붙어 저장/조회되는지 검증하는 통합 테스트.
 *
 * - 격리된 test 프로파일(application-test.yml)의 datasource 사용 → 개발 DB 와 분리
 * - 엔티티로 스키마를 직접 생성(create-drop)하므로 MySQL/SQLite 어느 환경에서도 통과
 * - @DataJpaTest 는 각 테스트를 트랜잭션으로 감싸고 끝나면 롤백 → 데이터 오염 없음
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class EntityPersistenceTest @Autowired constructor(
    private val em: TestEntityManager,
) {

    @Test
    @DisplayName("UserEntity 저장 및 조회")
    fun saveAndFindUser() {
        val user = UserEntity(
            email = "db-test@knou.ac.kr",
            name = "DB테스트",
            language = "KO",
            fontSize = "MEDIUM",
        )

        val saved = em.persistFlushFind(user)

        assertNotNull(saved.userId)              // AUTO_INCREMENT 채번 확인
        assertNotNull(saved.createdAt)           // @CreationTimestamp 채워짐
        assertEquals("db-test@knou.ac.kr", saved.email)
    }

    @Test
    @DisplayName("회의 참석 저장 - 연관관계까지 영속화")
    fun saveAttendanceWithAssociations() {
        val user = em.persist(
            UserEntity(email = "att@knou.ac.kr", name = "참석자", language = "KO", fontSize = "MEDIUM"),
        )
        val meeting = em.persist(
            MeetingEntity(title = "DB 통합 테스트 회의", meetingDate = LocalDateTime.now(), meetingCode = "MTG-DBTEST"),
        )

        val attendance = em.persistFlushFind(
            MeetingAttendanceEntity(meeting = meeting, user = user),
        )

        assertNotNull(attendance.attendanceId)
        assertEquals(meeting.meetingId, attendance.meeting.meetingId)
        assertEquals(user.userId, attendance.user.userId)
    }
}

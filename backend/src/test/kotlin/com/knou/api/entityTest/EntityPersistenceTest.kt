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
import org.springframework.test.context.TestPropertySource
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

/**
 * 실제 MySQL(onRingDb)에 JPA가 붙어 저장/조회되는지 검증하는 통합 테스트.
 *
 * - local 프로파일의 datasource(127.0.0.1:13306)를 그대로 사용
 * - 기존 스키마를 건드리지 않도록 ddl-auto=validate (엔티티 ↔ 실제 테이블 매핑 검증 겸함)
 * - @DataJpaTest 는 각 테스트를 트랜잭션으로 감싸고 끝나면 롤백 → 데이터 오염 없음
 *
 * 실행 전 DB_USERNAME / DB_PASSWORD 환경변수가 필요하다. (backend/.env 참고)
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("local")
@TestPropertySource(properties = ["spring.jpa.hibernate.ddl-auto=validate"])
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

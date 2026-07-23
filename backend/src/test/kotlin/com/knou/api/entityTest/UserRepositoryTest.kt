package com.knou.api.entityTest

import com.knou.api.entity.UserEntity
import com.knou.api.repository.UserRepository
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.test.context.ActiveProfiles
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * UserRepository 의 insert / findBy / update 동작을 격리된 test 프로필 DB에서 검증.
 * test 프로필(application-test.yml)이 엔티티로 스키마를 생성(create-drop)하므로
 * MySQL/SQLite 어느 환경에서도 사전 스키마 없이 돌아가고, 개발 데이터와 격리된다.
 * @DataJpaTest 라 각 테스트는 트랜잭션 후 롤백 → 데이터 오염 없음.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class UserRepositoryTest @Autowired constructor(
    private val userRepository: UserRepository,
) {

    private fun newUser() = UserEntity(
        email = "repo-test@knou.ac.kr",
        name = "레포테스트",
        language = "KO",
        fontSize = "MEDIUM",
    )

    @Test
    @DisplayName("save - insert 후 PK 채번 및 findById 조회")
    fun insertAndFindById() {
        val saved = userRepository.save(newUser())
        assertNotNull(saved.userId)

        val found = userRepository.findById(saved.userId!!).orElse(null)
        assertNotNull(found)
        assertEquals("repo-test@knou.ac.kr", found.email)
    }

    @Test
    @DisplayName("findByEmail / existsByEmail")
    fun findByEmail() {
        userRepository.save(newUser())

        val found = userRepository.findByEmail("repo-test@knou.ac.kr")
        assertNotNull(found)
        assertEquals("레포테스트", found.name)

        assertTrue(userRepository.existsByEmail("repo-test@knou.ac.kr"))
        assertFalse(userRepository.existsByEmail("none@knou.ac.kr"))
        assertNull(userRepository.findByEmail("none@knou.ac.kr"))
    }

    @Test
    @DisplayName("save - 기존 엔티티 update (더티 체킹)")
    fun update() {
        val saved = userRepository.save(newUser())

        // 영속 엔티티 필드 변경 → save 로 update
        saved.name = "이름변경"
        saved.vibrationYn = "Y"
        userRepository.saveAndFlush(saved)

        val updated = userRepository.findById(saved.userId!!).orElseThrow()
        assertEquals("이름변경", updated.name)
        assertEquals("Y", updated.vibrationYn)
    }
}

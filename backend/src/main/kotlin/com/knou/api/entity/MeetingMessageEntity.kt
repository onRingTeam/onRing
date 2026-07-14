package com.knou.api.entity

import com.knou.api.dto.common.Language
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

/**
 * 종료된 회의의 발화(채팅) 기록.
 *
 * 진행중에는 [com.knou.api.websocket.MeetingChatBuffer] 인메모리 버퍼에만 있다가,
 * 회의 종료 시 [com.knou.api.websocket.MeetingChatPersistListener] 가 여기로 영속화한다.
 * 저장 후 상세회의 '전체 대화' 탭(GET /transcript)에서 시간순으로 조회한다.
 *
 * userId 는 UserEntity FK 가 아닌 plain 컬럼이다. 참석 기록 없는 발화자도 관대하게
 * 저장하는 요약 정책([com.knou.api.service.MeetingSummaryService])과 맞추고, 조회 시
 * user 조인이 필요 없도록 [speakerName] 을 발화 시점 이름으로 비정규화해 함께 저장한다.
 *
 * 컬럼 매핑: 발화 텍스트·발화자명·발화 시각은 기존 채팅 스키마의 message/sender_name/sent_at
 * 컬럼을 재사용한다(속성명은 DTO 계약에 맞춰 original/speakerName/spokenAt 유지).
 */
@Entity
@Table(
    name = "meeting_message",
    indexes = [Index(name = "idx_message_meeting_sent", columnList = "meeting_id, sent_at")],
)
class MeetingMessageEntity(

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    var meeting: MeetingEntity,

    @Column(name = "user_id", nullable = false)
    var userId: Long,

    @Column(name = "sender_name", nullable = false, length = 100)
    var speakerName: String,

    @Column(name = "sent_at", nullable = false)
    var spokenAt: LocalDateTime,

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    var original: String,

    @Column(name = "translated", columnDefinition = "TEXT")
    var translated: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "lang", length = 30)
    var lang: Language? = null,
) {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    var messageId: Long? = null

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime? = null
}

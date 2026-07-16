package com.knou.api.repository

import com.knou.api.entity.MeetingMessageEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface MeetingMessageRepository : JpaRepository<MeetingMessageEntity, Long> {

    // 특정 회의의 전체 대화 (시간순 + PK 보조 정렬 — 동일 시각 발화의 저장 순서 보존)
    fun findAllByMeeting_MeetingIdOrderBySpokenAtAscMessageIdAsc(meetingId: Long): List<MeetingMessageEntity>

    // 이미 저장된 대화가 있는지 (종료 이벤트 중복 처리 시 재저장 방지)
    fun existsByMeeting_MeetingId(meetingId: Long): Boolean
}

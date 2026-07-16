package com.knou.api.websocket

/**
 * 회의 방 참여자 presence(화면 5 상단 화자 칩) STOMP DTO — 두 번째 토픽.
 *
 * 채팅(MessageDto)과 별개 토픽:
 * - 발행: `/app/meetings/{id}/participants/join`
 * - 구독: `/topic/meetings/{id}/participants`
 */

/** 클라이언트 → 서버: 입장 알림. */
data class ParticipantJoinRequest(
    /** 참여자 표시명. TODO Phase 6: 인증 도입 후 토큰의 userId로 대체. */
    val senderName: String,
)

/** 서버 → 구독자: 현재 방 참여자 이름 목록(입장/퇴장 시마다 브로드캐스트). */
data class ParticipantListResponse(
    val participants: List<String>,
)

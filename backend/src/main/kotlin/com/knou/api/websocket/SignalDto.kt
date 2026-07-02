package com.knou.api.websocket

/**
 * WebRTC Mesh 시그널링 메시지 — 세 번째 토픽.
 *
 * 서버는 내용에 관여하지 않고 방 토픽으로 그대로 중계(relay)한다.
 * 실제 P2P 협상(offer/answer/ICE) 로직은 클라이언트가 담당한다.
 *
 * - 발행: `/app/meetings/{id}/signal`
 * - 구독: `/topic/meetings/{id}/signal`  (수신 측은 `to` 로 자기 대상 필터)
 */
data class SignalMessage(
    /** "join" | "offer" | "answer" | "candidate" | "leave" */
    val type: String,

    /** 발신 peerId (클라이언트가 세션마다 생성) */
    val from: String,

    /** 수신 peerId. null 이면 방 전체 대상(예: join 공지). */
    val to: String? = null,

    /** SDP/ICE 등 직렬화(JSON string)된 페이로드. relay는 내용 미관여. */
    val payload: String? = null,
)

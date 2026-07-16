package com.knou.api.websocket

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

/**
 * 회의별 현재 참여자를 STOMP 세션 단위로 추적하는 인메모리 레지스트리.
 *
 * TODO 다중 인스턴스 확장 시: 인메모리 → Redis 등 공유 저장소로 전환.
 */
@Component
class PresenceRegistry {

    // meetingId -> (sessionId -> 참여자명)
    private val rooms = ConcurrentHashMap<Long, ConcurrentHashMap<String, String>>()

    /** 입장 처리 후 갱신된 참여자 목록 반환. */
    fun join(meetingId: Long, sessionId: String, name: String): List<String> {
        val room = rooms.computeIfAbsent(meetingId) { ConcurrentHashMap() }
        room[sessionId] = name
        return room.values.toList()
    }

    /**
     * 세션 종료 시 해당 세션을 모든 방에서 제거.
     * @return (해당 회의 ID, 남은 참여자 목록) — 어느 방에도 없으면 null.
     */
    fun leave(sessionId: String): Pair<Long, List<String>>? {
        for ((meetingId, room) in rooms) {
            if (room.remove(sessionId) != null) {
                return meetingId to room.values.toList()
            }
        }
        return null
    }
}

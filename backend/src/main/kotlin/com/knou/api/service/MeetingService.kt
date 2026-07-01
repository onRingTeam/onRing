package com.knou.api.service

import com.knou.api.dto.common.MeetingStatus
import com.knou.api.dto.meeting.CreateMeetingRequest
import com.knou.api.dto.meeting.MeetingRoomResponse
import com.knou.api.entity.MeetingAttendanceEntity
import com.knou.api.entity.MeetingEntity
import com.knou.api.repository.MeetingAttendanceRepository
import com.knou.api.repository.MeetingRepository
import com.knou.api.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

/**
 * 회의 생성/참여/조회 비즈니스 로직.
 */
@Service
class MeetingService(
    private val meetingRepository: MeetingRepository,
    private val userRepository: UserRepository,
    private val attendanceRepository: MeetingAttendanceRepository,
) {

    /**
     * 신규 회의 생성. 회의 코드('날짜+회의명 첫글자+UUID')를 자동 생성하고,
     * 개설자를 참석자로 등록한 뒤 회의실 진입 정보를 반환한다.
     *
     * @throws ResponseStatusException 404(사용자 없음)
     */
    @Transactional
    fun create(userId: Long, request: CreateMeetingRequest): MeetingRoomResponse {
        val user = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다: $userId")
        }

        val meeting = meetingRepository.save(
            MeetingEntity(
                title = request.title,
                meetingDate = LocalDateTime.now(),
                meetingCode = generateMeetingCode(request.title),
                status = "IN_PROGRESS",
            ),
        )

        // 개설자를 참석자로 등록 (내 언어를 번역 언어로 저장)
        attendanceRepository.save(
            MeetingAttendanceEntity(
                meeting = meeting,
                user = user,
                translateLanguage = request.language.name,
            ),
        )

        return MeetingRoomResponse(
            meetingId = meeting.meetingId!!,
            title = meeting.title,
            meetingCode = meeting.meetingCode,
            status = MeetingStatus.valueOf(meeting.status),
            host = true,
        )
    }

    /** 회의 코드 생성: yyyyMMdd + 회의명 첫 글자(대문자) + '-' + UUID 6자리. 충돌 시 재시도. */
    private fun generateMeetingCode(title: String): String {
        val datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
        val initial = title.trim().firstOrNull()?.uppercaseChar() ?: 'X'
        repeat(5) {
            val suffix = UUID.randomUUID().toString().replace("-", "").take(6)
            val code = "$datePart$initial-$suffix"
            if (!meetingRepository.existsByMeetingCode(code)) return code
        }
        throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "회의 코드 생성에 실패했습니다.")
    }

    /**
     * 회의 코드로 참여. 코드로 회의를 조회해 실제 meetingId·회의 정보를 반환하고,
     * 참석 기록(중복 방지)을 남긴다.
     *
     * @throws ResponseStatusException 404(코드 없음/사용자 없음), 409(종료된 회의)
     */
    @Transactional
    fun join(userId: Long, meetingCode: String): MeetingRoomResponse {
        val meeting = meetingRepository.findByMeetingCode(meetingCode)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "회의 코드를 찾을 수 없습니다: $meetingCode")

        if (meeting.status == "ENDED") {
            throw ResponseStatusException(HttpStatus.CONFLICT, "이미 종료된 회의입니다.")
        }

        val user = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다: $userId")
        }

        val meetingId = meeting.meetingId
            ?: throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "회의 ID가 없습니다.")

        // 참석 기록이 없으면 생성 (idempotent — 재참여 시 중복 저장 방지)
        if (attendanceRepository.findByMeeting_MeetingIdAndUser_UserId(meetingId, userId) == null) {
            attendanceRepository.save(
                MeetingAttendanceEntity(
                    meeting = meeting,
                    user = user,
                    translateLanguage = user.language,
                ),
            )
        }

        return MeetingRoomResponse(
            meetingId = meetingId,
            title = meeting.title,
            meetingCode = meeting.meetingCode,
            status = MeetingStatus.valueOf(meeting.status),
            // MeetingEntity 에 개설자 개념이 없어 참여자는 항상 host=false.
            // TODO: 개설자(creator) 필드 도입 시 실제 판별.
            host = false,
        )
    }
}

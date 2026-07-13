package com.knou.api.service

import com.knou.api.dto.common.Language
import com.knou.api.dto.common.MeetingStatus
import com.knou.api.dto.common.PageResponse
import com.knou.api.dto.meeting.CreateMeetingRequest
import com.knou.api.dto.meeting.MeetingDetailResponse
import com.knou.api.dto.meeting.MeetingMessageResponse
import com.knou.api.dto.meeting.MeetingListItemResponse
import com.knou.api.dto.meeting.MeetingRoomResponse
import com.knou.api.dto.meeting.SpeakerStatResponse
import com.knou.api.entity.MeetingAttendanceEntity
import com.knou.api.entity.MeetingEntity
import com.knou.api.repository.MeetingAttendanceRepository
import com.knou.api.repository.MeetingRepository
import com.knou.api.repository.UserRepository
import com.knou.api.websocket.MeetingChatBuffer
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Duration
import java.time.LocalDateTime

/** 회의 코드 문자셋 — 혼동 쉬운 O,0,I,1,L 제외. */
private const val CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

/** 홈 최근 회의 기본 개수 (화면정의서 2-d, api-spec: 최근 회의 4건). */
private const val RECENT_LIMIT = 4

/**
 * 회의 생성/참여/조회 비즈니스 로직.
 */
@Service
class MeetingService(
    private val meetingRepository: MeetingRepository,
    private val userRepository: UserRepository,
    private val attendanceRepository: MeetingAttendanceRepository,
    private val chatBuffer: MeetingChatBuffer,
) {

    /**
     * 신규 회의 생성. 회의 코드('날짜+회의명 첫글자+UUID')를 자동 생성하고,
     * 개설자를 참석자(개설여부 Y)로 등록한 뒤 회의실 진입 정보를 반환한다.
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
                meetingCode = generateMeetingCode(),
                status = "IN_PROGRESS",
            ),
        )

        // 개설자를 참석자로 등록 (내 언어를 번역 언어로 저장, 개설여부 Y)
        attendanceRepository.save(
            MeetingAttendanceEntity(
                meeting = meeting,
                user = user,
                translateLanguage = request.language.name,
                isCreated = "Y",
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

    /** 회의 코드 생성: 혼동 문자(O,0,I,1,L) 제외한 6자리 대문자·숫자. 충돌 시 재시도. */
    private fun generateMeetingCode(): String {
        repeat(10) {
            val code = (1..6).map { CODE_ALPHABET.random() }.joinToString("")
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
        val attendance = attendanceRepository.findByMeeting_MeetingIdAndUser_UserId(meetingId, userId)
            ?: attendanceRepository.save(
                MeetingAttendanceEntity(
                    meeting = meeting,
                    user = user,
                    translateLanguage = user.language,
                ),
            )

        return MeetingRoomResponse(
            meetingId = meetingId,
            title = meeting.title,
            meetingCode = meeting.meetingCode,
            status = MeetingStatus.valueOf(meeting.status),
            host = attendance.isCreated == "Y",
        )
    }

    /**
     * 현재 진행중인 내 회의 조회. 없으면 null(컨트롤러에서 204). (화면정의서 1-c)
     */
    @Transactional(readOnly = true)
    fun activeMeeting(userId: Long): MeetingRoomResponse? {
        // useYn=Y 만 — 참여자가 "재참여 안 함"으로 나간(useYn=N) 회의는 진행중으로 잡지 않는다
        // (그래야 홈에서 새 회의 개설이 다시 가능해진다).
        val attendance = attendanceRepository
            .findFirstByUser_UserIdAndMeeting_StatusAndUseYn(userId, "IN_PROGRESS", "Y")
            ?: return null
        val meeting = attendance.meeting
        return MeetingRoomResponse(
            meetingId = meeting.meetingId!!,
            title = meeting.title,
            meetingCode = meeting.meetingCode,
            status = MeetingStatus.valueOf(meeting.status),
            host = attendance.isCreated == "Y",
        )
    }

    /**
     * 홈 화면 최근 회의 목록. 내 참석 이력을 회의 날짜 최신순으로 limit 건 반환. (화면정의서 2-d)
     */
    @Transactional(readOnly = true)
    fun recent(userId: Long, limit: Int = RECENT_LIMIT): List<MeetingListItemResponse> {
        return attendanceRepository
            .findAllByUser_UserIdOrderByMeeting_MeetingDateDesc(userId)
            // 진행중 회의는 최근 회의에서 제외 (종료된 회의만 노출)
            .filter { it.meeting.status == MeetingStatus.ENDED.name }
            // 사용자가 삭제(use_yn=N)한 회의록은 제외
            .filter { it.useYn == "Y" }
            .take(limit)
            .map { toListItem(it) }
    }

    /**
     * 회의록 목록/검색. 내 회의 대상 회의명·코드·요약 like 검색 + 즐겨찾기 필터 + 페이징. (화면정의서 3-b, 3-c, 3-d)
     */
    @Transactional(readOnly = true)
    fun search(
        userId: Long,
        keyword: String?,
        favoriteOnly: Boolean,
        page: Int,
        size: Int,
    ): PageResponse<MeetingListItemResponse> {
        val kw = keyword?.trim()?.lowercase()?.takeIf { it.isNotEmpty() }

        val filtered = attendanceRepository
            .findAllByUser_UserIdOrderByMeeting_MeetingDateDesc(userId)
            .asSequence()
            // 회의록 목록에는 종료(ENDED)된 회의만 노출 (진행중 회의는 제외)
            .filter { it.meeting.status == MeetingStatus.ENDED.name }
            // 사용자가 삭제(use_yn=N)한 회의록은 제외
            .filter { it.useYn == "Y" }
            .filter { !favoriteOnly || it.favoriteYn == "Y" }
            .filter { att ->
                kw == null || run {
                    val m = att.meeting
                    m.title.lowercase().contains(kw) ||
                        m.meetingCode.lowercase().contains(kw) ||
                        (m.summary?.lowercase()?.contains(kw) ?: false)
                }
            }
            .toList()

        val total = filtered.size.toLong()
        val safeSize = if (size <= 0) 20 else size
        val totalPages = if (total == 0L) 0 else ((total + safeSize - 1) / safeSize).toInt()
        val content = filtered
            .drop(page * safeSize)
            .take(safeSize)
            .map { toListItem(it) }

        return PageResponse(
            page = page,
            size = safeSize,
            totalElements = total,
            totalPages = totalPages,
            content = content,
        )
    }

    /**
     * 상세회의 - AI 요약. 회의 기본 정보 + 참석자 기반 화자별 통계를 반환한다. (화면정의서 4-b, 4-c)
     * (AI 요약 내용·액션아이템은 추후 배치가 채움 — 없으면 null/0.)
     *
     * @throws ResponseStatusException 404(회의 없음)
     */
    @Transactional(readOnly = true)
    fun detail(meetingId: Long): MeetingDetailResponse {
        val meeting = meetingRepository.findById(meetingId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "회의를 찾을 수 없습니다: $meetingId")
        }
        val attendances = attendanceRepository.findAllByMeeting_MeetingId(meetingId)

        val totalSpeech = attendances.sumOf { it.speechCount }
        val speakers = attendances.map { att ->
            SpeakerStatResponse(
                userId = att.user.userId!!,
                name = att.user.name,
                actionItem = att.actionItem,
                speechCount = att.speechCount,
                speechRatio = if (totalSpeech > 0) att.speechCount * 100.0 / totalSpeech else 0.0,
            )
        }
        val languageCount = attendances.mapNotNull { it.translateLanguage }.distinct().size

        return MeetingDetailResponse(
            meetingId = meeting.meetingId!!,
            title = meeting.title,
            meetingDate = meeting.meetingDate,
            participantCount = attendances.size,
            languageCount = languageCount,
            durationSec = meeting.durationSec,
            summary = meeting.summary,
            speakers = speakers,
        )
    }

    /**
     * 즐겨찾기 토글. 내 참석 레코드의 favoriteYn 을 Y/N 전환. (화면정의서 3-c, 3-d)
     *
     * @throws ResponseStatusException 404(참석 기록 없음)
     */
    @Transactional
    fun toggleFavorite(userId: Long, meetingId: Long) {
        val attendance = attendanceRepository.findByMeeting_MeetingIdAndUser_UserId(meetingId, userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "참석 기록을 찾을 수 없습니다.")
        attendance.favoriteYn = if (attendance.favoriteYn == "Y") "N" else "Y"
    }

    /**
     * 회의록 선택 삭제(소프트). 내 참석 레코드의 useYn 을 N 으로 바꿔 내 목록에서만 숨긴다.
     * 회의 자체와 다른 참석자의 회의록에는 영향이 없다.
     */
    @Transactional
    fun delete(userId: Long, meetingIds: List<Long>) {
        attendanceRepository
            .findAllByUser_UserIdAndMeeting_MeetingIdIn(userId, meetingIds)
            .forEach { it.useYn = "N" }
    }

    /**
     * 회의 종료. 개설자(개설여부 Y)만 종료할 수 있으며, 상태를 ENDED 로 바꾸고 소요 시간을 계산한다. (화면정의서 5-a-1)
     *
     * @throws ResponseStatusException 404(회의/참석 없음), 403(개설자 아님), 409(이미 종료)
     */
    @Transactional
    fun end(userId: Long, meetingId: Long) {
        val meeting = meetingRepository.findById(meetingId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "회의를 찾을 수 없습니다: $meetingId")
        }
        val attendance = attendanceRepository.findByMeeting_MeetingIdAndUser_UserId(meetingId, userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "참석 기록을 찾을 수 없습니다.")

        if (attendance.isCreated != "Y") {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "회의 개설자만 종료할 수 있습니다.")
        }
        if (meeting.status == "ENDED") {
            throw ResponseStatusException(HttpStatus.CONFLICT, "이미 종료된 회의입니다.")
        }

        meeting.status = "ENDED"
        meeting.durationSec = Duration.between(meeting.meetingDate, LocalDateTime.now()).seconds.toInt()
    }

    /**
     * 회의 나가기(참여자 전용, "재참여 안 함"). 내 참석 레코드의 useYn 을 N 으로 바꿔
     * 진행중 회의(activeMeeting) · 내 회의록 목록에서 제외한다. 회의 자체와 다른 참석자에겐 영향 없다.
     * 실시간 presence 는 WebSocket 연결 종료로 자동 정리된다.
     *
     * @throws ResponseStatusException 404(참석 없음), 403(개설자 — 개설자는 종료를 사용)
     */
    @Transactional
    fun leave(userId: Long, meetingId: Long) {
        val attendance = attendanceRepository.findByMeeting_MeetingIdAndUser_UserId(meetingId, userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "참석 기록을 찾을 수 없습니다.")
        if (attendance.isCreated == "Y") {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "개설자는 나갈 수 없습니다. 회의를 종료하세요.")
        }
        attendance.useYn = "N"
    }

    /** MeetingAttendance(내 참석 레코드) → 목록 카드 DTO 매핑. 참여자명·사용 언어는 회의 전체 참석자에서 집계. */
    private fun toListItem(myAttendance: MeetingAttendanceEntity): MeetingListItemResponse {
        val meeting = myAttendance.meeting
        val meetingId = meeting.meetingId!!
        val all = attendanceRepository.findAllByMeeting_MeetingId(meetingId)
        val languages = all
            .mapNotNull { it.translateLanguage }
            .distinct()
            .mapNotNull { runCatching { Language.valueOf(it) }.getOrNull() }

        return MeetingListItemResponse(
            meetingId = meetingId,
            title = meeting.title,
            favorite = myAttendance.favoriteYn == "Y",
            meetingDate = meeting.meetingDate,
            durationSec = meeting.durationSec,
            participantNames = all.map { it.user.name },
            languages = languages,
            summary = meeting.summary,
            status = MeetingStatus.valueOf(meeting.status),
        )
    }

    /**
     * 진행중 회의의 채팅 메시지 조회 (시간순, 인메모리 버퍼 — 회의 종료 시 폐기).
     * 웹소켓 재연결 시 놓친 메시지 복구용 — [after] 이후만, 생략 시 보관분 전체.
     *
     * @throws ResponseStatusException 404(회의 없음)
     */
    fun messages(meetingId: Long, after: LocalDateTime?): List<MeetingMessageResponse> {
        if (!meetingRepository.existsById(meetingId)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "회의를 찾을 수 없습니다: $meetingId")
        }
        return chatBuffer.since(meetingId, after)
    }

    /** 회의 종료 시 채팅 버퍼 폐기 (인메모리 보관분은 회의와 함께 소멸). */
    fun clearChat(meetingId: Long) {
        chatBuffer.clear(meetingId)
    }
}

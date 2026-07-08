# 회의 종료 후 AI 요약·액션아이템 생성 (Gemini)

> 상태: **구현·검증 완료** — 실 Gemini E2E까지 로그로 확인. 브랜치 `feat/ai_summary`.
> 대상 화면: 회의 진행(화면 5) 종료 → 상세회의 AI 요약(화면 4).
> 관련 코드: `backend/.../websocket/*`, `backend/.../client/GeminiClient.kt`, `backend/.../service/MeetingSummaryService.kt`,
> `app/knou-app/src/screens/notes/*`, `app/knou-app/src/screens/meeting-room/*`.

## 1. 목표

회의(채팅)가 종료되면 그동안의 대화 전체를 Gemini 경량 모델에 보내
**회의 요약 + 참석자별 액션아이템**을 생성해 DB에 저장하고, 회의 상세 화면에 노출한다.
발화 수 통계(화자별 발화 바)도 이 후처리에서 채운다.

## 2. 전체 흐름

```
회의 종료(POST /api/meetings/{id}/end)
  → MeetingService.end() 커밋(status=ENDED, durationSec 계산)
  → MeetingService.clearChat() → MeetingChatBuffer.clear()
       └─ 채팅 ≥1건이면 MeetingChatArchivedEvent 발행 (messagesJson=시간순 전체)
  → MeetingChatArchivedListener.onChatArchived()  [@Async — 종료 API 응답을 막지 않음]
       ├─ TX1  recordSpeechCounts : userId로 매칭해 speech_count 집계 (LLM과 무관하게 먼저 확정)
       ├─ LLM  GeminiClient.summarizeMeeting : 요약 + 액션아이템 생성 (실패 시 2초 후 1회 재시도)
       └─ TX2  saveSummary : meeting.summary + 참석자별 action_item 저장
  → 프론트 상세 화면(notes/[id])이 summary 채워질 때까지 폴링 → 노출
```

**이벤트 발행 시점 안전성**: 컨트롤러(`endMeeting`)는 트랜잭션이 없으므로 `end()`의
`@Transactional`이 리턴 시점에 커밋되고, 그 뒤 `clearChat()`에서 이벤트가 발행된다.
따라서 `@Async` 리스너의 새 트랜잭션에서 회의를 조회하면 이미 `status=ENDED` 상태가 보인다.

## 3. 발화자 정합성 — userId 기준

인증 도입 전이라 채팅은 표시명(senderName)만 있었으나, 요약의 발화 수·액션아이템을
정확히 매칭하기 위해 **채팅 메시지에 발화자 userId(senderId)를 끝까지 전파**한다.

| 계약 | 추가 필드 |
|---|---|
| `MessageRequest` (앱→서버 발행) | `senderId: Long` |
| `MessageResponse` (서버→구독자 브로드캐스트) | `senderId: Long` |
| `MeetingMessageResponse` (버퍼·재연결 복구·이벤트 JSON) | `userId: Long` |
| 프론트 `ChatMessageRequest/Response`, `MeetingMessageDto` | `senderId` / `userId` |

- 프론트는 `auth-store`의 `backendUserId`를 발행 페이로드에 실어 보낸다.
- 매칭은 `attendance.user.userId` ↔ 메시지 `userId`. 참석 기록 없는 발화자·목록에 없는
  액션아이템 userId는 **로그만 남기고 무시**한다.

## 4. 백엔드 구성

| 파일 | 역할 |
|---|---|
| `config/GeminiProperties.kt` | `gemini.*` 바인딩 (apiKey, model, 타임아웃). `SupabaseProperties` 패턴 |
| `client/GeminiClient.kt` | generateContent 호출 전담. 프롬프트 조립 + REST + 구조화 JSON 파싱 |
| `service/MeetingSummaryService.kt` | TX1 발화 수 집계 / TX2 요약·액션아이템 저장 (트랜잭션 2분할) |
| `websocket/MeetingChatArchivedListener.kt` | 오케스트레이션(TX1→LLM→TX2), 실패 격리 |

**트랜잭션 2분할 이유**: LLM 호출(수 초) 동안 DB 커넥션/트랜잭션을 잡지 않기 위해
발화 수 집계(TX1)와 요약 저장(TX2)을 분리하고, 오케스트레이션은 리스너가 담당한다.

**Gemini 호출**
- `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- 인증: 헤더 `x-goog-api-key` (URL 쿼리보다 로그 유출에 안전)
- `generationConfig.responseMimeType=application/json` + `responseSchema`로 응답 구조 강제:
  ```json
  { "summary": "string", "actionItems": [ { "userId": 1, "actionItem": "..." } ] }
  ```
- 프롬프트: 회의명 + 참석자 목록(`userId — 이름`) + `[HH:mm] 발화자명: 원문` 시간순.
  지시 — 요약 3~6문장 평문(마크다운 금지), **참석자당 액션아이템 정확히 1건**(없으면 생략),
  `userId`는 참석자 목록 값만 사용.

**저장처** (컬럼은 이미 존재)
- `meeting.summary` (TEXT)
- `meeting_attendance.action_item` (TEXT, 참석자당 1건 — 중복 오면 첫 건만)
- `meeting_attendance.speech_count` (발화 수 집계)

**실패 격리**: API 키 미설정 또는 LLM 실패 시 로그만 남기고 회의 종료 흐름엔 영향 없음.
`summary`는 null로 남고, 프론트는 폴링 상한 도달 후 "요약 없음"을 표시한다.

## 5. 프론트 UX — 종료 후 상세 이동 + 폴링

- **회의 종료 → `notes/[id]` 상세로 이동** (`router.replace`, `fresh=1`). 기존엔 홈으로 이동했음.
- `fresh=1`(방금 종료한 회의)일 때만 `useMeetingDetail`이 요약을 기다린다:
  - `refetchInterval` 3초 간격, `summary`가 채워지면 중단.
  - **최대 20회(약 60초) 상한** — 채팅 0건이면 이벤트 자체가 발행되지 않아 summary가
    영영 안 채워지므로 무한 폴링을 막는다. 과거 회의록 열람 시엔 폴링하지 않는다.
- 요약 카드: `summary` 있음 → 표시 / 없음 + 폴링 중 → "AI 요약 생성 중..." + 스피너 /
  없음 + 폴링 아님·포기 → "AI 요약이 아직 없습니다."

> 조회 API(`GET /api/meetings/{id}` → `MeetingDetailResponse`)와 상세 화면 렌더링은
> 이미 summary/actionItem/speechCount를 다루고 있어 폴링·문구만 추가했다.

## 6. 설정

`backend/.env` (git-ignored) — 실 키:
```
GEMINI_API_KEY=<Google AI Studio 발급 키>
# GEMINI_MODEL=gemini-2.5-flash-lite   # 기본값
```
`application.yml`:
```yaml
gemini:
  api-key: ${GEMINI_API_KEY:}
  model: ${GEMINI_MODEL:gemini-2.5-flash-lite}
```
키 미설정이어도 앱은 정상 동작하며 요약만 생략된다.

## 7. 검증 상태

- ✅ 백엔드 컴파일 + `MeetingSummaryServiceTest` 단위테스트 통과
  (userId 매칭 발화 수 집계 / 액션아이템 저장·미매칭 무시 / 동일 userId 중복 첫 건만).
- ✅ 프론트 `tsc --noEmit` 타입체크 통과 (변경 파일 클린).
- ✅ **실 Gemini E2E 통과** — 로그로 확인 (아래 §7.1).

### 7.1 실측 로그 (회의 35, 채팅 6건)

```
23:40:56  WARN  [chat-archive] 회의 35 요약 1차 실패, 재시도: 503 Service Unavailable
                ("This model is currently experiencing high demand... UNAVAILABLE")
23:41:02  INFO  [chat-archive] 회의 35 요약 완료 (채팅 6건)
```

- **Gemini 실호출 성공**: `AQ.` 키 형식·`x-goog-api-key` 헤더·엔드포인트·요청 바디 정상.
- **응답 파싱 성공**: `요약 완료` 로그는 `saveSummary` 성공 후에만 찍히므로,
  `responseSchema → candidates[0].content.parts[0].text → MeetingSummaryResult` 파싱이 정상 동작.
- **재시도 로직이 실전에서 유효**: 1차 호출이 Gemini 과부하 503을 받았으나,
  "2초 후 1회 재시도"가 이를 흡수해 성공. (재시도가 없었으면 해당 회의 요약이 유실될 상황)
- **저장 반영 확인**: 요약 완료 직전 `summary=?`(meeting), `action_item=?`·`speech_count=?`
  (meeting_attendance) update SQL 관측. ERROR 레벨 없음.
- **비동기 확인**: 전체 약 6.5초(첫 실패 + 2초 대기 + 재시도)였으나 `@Async`라 종료 API 응답은 안 막음.

> 남은 미검증: `KnouApiApplicationTests.contextLoads`(실 DB 필요 — 기능과 무관).
> 알려진 한계: 재시도 2회 모두 503이면 요약은 유실되고 로그만 남는다(회의 종료엔 영향 없음).
> 필요 시 재시도 횟수·백오프 확대 또는 종료 후 배치 재생성으로 보강 가능.

**E2E 재확인 절차**
1. `backend/.env`에 `GEMINI_API_KEY` 설정 → 백엔드 기동.
2. 서로 다른 사용자로 회의 생성/참여 → 채팅 5~10건.
3. 개설자 종료 → 앱이 상세로 이동, "AI 요약 생성 중..." 표시.
4. 수 초 내 요약/액션아이템/화자별 발화 바가 채워지는지 확인.
   서버 로그 `[chat-archive] 회의 N 요약 완료` 확인.
5. 회귀: (a) 채팅 0건 종료 → 60초 후 "요약 없습니다" 정착 (b) 키 제거 → 종료 204 정상,
   WARN 로그만 (c) 회의록 목록에서 과거 회의 진입 → 폴링 없음.

## 8. 관련 커밋 (feat/ai_summary)

| 커밋 | 내용 |
|---|---|
| `feat/회의:` 채팅 메시지에 발화자 userId 추가 | 정합성 기준 senderId/userId 전파 (백엔드) |
| `feat/회의:` 회의 종료 후 Gemini AI 요약·액션아이템 생성 | 리스너·GeminiClient·SummaryService |
| `test/회의:` AI 요약 저장 서비스 단위테스트 | mockito-kotlin |
| `feat/회의:` 프론트 채팅 발행·복구에 senderId 추가 | 계약 일치 |
| `feat/회의록:` 회의 종료 후 상세 이동 + AI 요약 생성 폴링 | UX |

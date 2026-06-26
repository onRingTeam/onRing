# OnRing API 명세서 v1.1

> 언어의 장벽을 끄고, 소통의 링을 켜다.
> [OnRing_화면정의서_v1.1.pdf](OnRing_화면정의서_v1.1.pdf) 기반 REST API 명세.

## 공통 사항

- Base URL: `http://localhost:8080`
- 인증: **(임시)** 현재 사용자는 `X-User-Id` 헤더로 식별. → 추후 JWT 적용 예정
- 요청/응답: `application/json` (내보내기 API 제외)
- Swagger UI: `/swagger-ui.html` · OpenAPI JSON: `/v3/api-docs`

### 공통 코드(enum)

| 구분 | 값 |
|------|-----|
| Language | `KO`(한) · `JA`(일) · `ZH`(중) · `EN`(영) |
| FontSize | `SMALL`(작게) · `MEDIUM`(보통) · `LARGE`(크게) · `XLARGE`(매우크게) |
| MeetingStatus | `IN_PROGRESS`(진행중) · `ENDED`(종료) |
| ExportFormat | `PDF` · `TXT` |

---

## 1. 회원 / 설정 (User) — 화면 6

| Method | Path | 설명 | 화면 |
|--------|------|------|------|
| GET | `/api/users/me` | 내 프로필 + 채팅 설정 조회 | 6-a, 6-c |
| PATCH | `/api/users/me/profile` | 프로필(회원명) 수정 (소셜 로그인 시 불가) | 6-a-i |
| PATCH | `/api/users/me/chat-settings` | 내 언어/글씨크기/진동 설정 수정 | 6-c |

**GET /api/users/me → 200**
```json
{
  "userId": 1,
  "email": "user@knou.ac.kr",
  "name": "고윤아",
  "social": true,
  "subscribed": false,
  "remainingCount": 5,
  "language": "KO",
  "fontSize": "MEDIUM",
  "vibration": false
}
```

**PATCH /api/users/me/profile** `{ "name": "고윤아" }` → 204
**PATCH /api/users/me/chat-settings** `{ "language": "KO", "fontSize": "LARGE", "vibration": true }` → 204

---

## 2. 회의 (Meeting) — 화면 2·3·4·5

| Method | Path | 설명 | 화면 |
|--------|------|------|------|
| GET | `/api/meetings/active` | 현재 진행중인 내 회의 조회 (없으면 204) | 1-c |
| POST | `/api/meetings` | 신규 회의 생성 (코드 자동 생성) | 2-b-i-1 |
| POST | `/api/meetings/join` | 회의 코드로 참여 | 2-c-i |
| GET | `/api/meetings/recent` | 홈 최근 회의 4건 | 2-d |
| GET | `/api/meetings` | 회의록 목록/검색(keyword·favoriteOnly·page·size) | 3-b·3-c·3-d |
| GET | `/api/meetings/{meetingId}` | 상세회의 - AI 요약(요약/액션아이템/발화빈도) | 4-b·4-c |
| GET | `/api/meetings/{meetingId}/messages` | 상세회의 - 전체 대화(원문·번역) | 4-d |
| PATCH | `/api/meetings/{meetingId}/favorite` | 즐겨찾기 토글 | 3-c·3-d |
| POST | `/api/meetings/{meetingId}/end` | 회의 종료 (개설자만) | 5-a-1 |
| POST | `/api/meetings/{meetingId}/export` | 회의록 내보내기 (PDF/TXT) | 3-d-ii·4-c-iii |

**GET /api/meetings/active**
- 진행중 회의 있음 → 200, `MeetingRoomResponse` (회의실 진입 정보)
- 없음 → 204 No Content
> 회의 탭 빨간 배경(1-c)·홈→회의 탭 동적 분기(1-c-i)·새 회의 생성 confirm(2-b-i-1) 판단용.

**POST /api/meetings** `{ "title": "주간 정기회의", "language": "KO" }` → 200
```json
{
  "meetingId": 10,
  "title": "주간 정기회의",
  "meetingCode": "20260626J-3f9a2b",
  "status": "IN_PROGRESS",
  "host": true
}
```
> 이미 진행중인 회의가 있으면 `409`(회의실 이동 confirm). 종료/없는 코드로 참여 시 에러 안내.

**GET /api/meetings?keyword=정기&favoriteOnly=false&page=0&size=20 → 200**
```json
{
  "page": 0, "size": 20, "totalElements": 37, "totalPages": 2,
  "content": [
    {
      "meetingId": 10, "title": "주간 정기회의", "favorite": false,
      "meetingDate": "2026-06-26T14:00:00", "durationSec": 3600,
      "participantNames": ["고윤아", "김철수"], "languages": ["KO", "EN"],
      "summary": "다음 분기 로드맵 논의 ...", "status": "ENDED"
    }
  ]
}
```

**GET /api/meetings/{meetingId} → 200** (AI 요약 탭)
```json
{
  "meetingId": 10, "title": "주간 정기회의",
  "meetingDate": "2026-06-26T14:00:00",
  "participantCount": 4, "languageCount": 2, "durationSec": 3600,
  "summary": "회의 요약 ...",
  "speakers": [
    { "userId": 1, "name": "고윤아", "actionItem": "API 명세 정리 담당", "speechCount": 12, "speechRatio": 34.2 }
  ]
}
```

**GET /api/meetings/{meetingId}/messages → 200** (전체 대화 탭)
```json
[
  { "messageId": 1001, "speakerName": "고윤아", "spokenAt": "2026-06-26T14:05:12", "original": "안녕하세요", "translated": "Hello" }
]
```

**POST /api/meetings/{meetingId}/export** `{ "format": "PDF", "includeSummary": true, "includeFullChat": false }`
→ 200, `Content-Type: application/pdf` (또는 `text/plain`), 파일 바이트

---

## 실시간 채팅 (회의화면 5) — 별도 WebSocket

화면 5(회의실)의 실시간 발화/번역/음소거/읽어주기는 REST가 아닌 **WebSocket(STOMP)** 으로 설계 예정.
(`spring-boot-starter-websocket` 의존성은 이미 추가되어 있음 — 본 명세 범위 밖, 추후 별도 문서화)

---

## 구현 상태

현재 컨트롤러는 **스켈레톤(Swagger 노출용 스텁)** 상태이며, 실제 로직(회의 코드 생성, AI 요약,
권한 체크, 번역 등)은 서비스 계층에서 구현 예정. (코드 내 `TODO` 표기)

---

## 변경 이력

- **v1.1** — 회의 탭 진행중 상태 표시(빨간 배경) 추가 → `GET /api/meetings/active` 신설. 슬로건 문구 변경("켠다"→"켜다").
- **v1** — 최초 작성.

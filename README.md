<div align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=soft&color=0FB9B1&height=140&text=onRing&animation=fadeIn&fontColor=ffffff&fontSize=72&desc=%EC%96%B8%EC%96%B4%EC%9D%98%20%EC%9E%A5%EB%B2%BD%EC%9D%84%20%EB%81%84%EA%B3%A0,%20%EC%86%8C%ED%86%B5%EC%9D%98%20%EB%A7%81%EC%9D%84%20%EC%BC%9C%EB%8B%A4&descSize=20&descAlignY=72"
    width="100%"
  />
</div>

# onRing · 청인·농인 실시간 접근성 회의 앱

> **언어의 장벽을 끄고, 소통의 링을 켜다.**

## 📝 프로젝트 개요

**onRing**은 청인(듣는 사람)과 농인·청각장애인이 **하나의 회의에 함께 참여**할 수 있도록 만든
실시간 접근성 회의 애플리케이션입니다.

같은 회의방 안에서

- **청인끼리는 WebRTC로 실제 목소리 통화**를 하고,
- 말한 내용은 **온디바이스 음성인식(STT)** 을 거쳐 **자막**으로 농인에게 전달되며,
- 농인이 입력한 **채팅**은 청인의 기기에서 **음성(TTS)** 으로 재생됩니다.
- 참여자마다 언어(한/일/중/영)가 달라도 **온디바이스 번역**으로 서로의 발화를 각자 언어로 읽습니다.
- 회의가 끝나면 **AI(Gemini)가 회의록을 자동 요약**하고, 대화 전문을 저장·내보내기(JSON/MD)할 수 있습니다.

> 핵심 설계 원칙: **텍스트는 STOMP, 음성은 WebRTC로 완전히 분리**한다.
> 각 참여자는 "자기 마이크"만 STT 하고, 확정된 텍스트만 서버로 전송한다.

## 👥 팀원 소개

> 담당 표기는 `dev` 브랜치 커밋 기여 내역을 바탕으로 정리한 것으로, 두 사람 모두 프런트·백엔드 전반에 참여했습니다.

| 이름 | GitHub | 주요 담당 |
|------|--------|-----------|
| 신민혁 | [@minhyeokshin](https://github.com/minhyeokshin) | 실시간 회의(회의방·STOMP/WebRTC 시그널링), 온디바이스 STT, 백엔드 인프라·보안(JWT·Config), CI/CD |
| 고윤아 | [@kya9505](https://github.com/kya9505) | 앱 화면(홈·회의록·설정), AI 회의 요약·번역, UI/UX 컴포넌트, 소셜 로그인 및 관련 백엔드 서비스 |

## 🛠️ 기술 스택

### 📱 App (`app/knou-app/`)
- **Framework**: React Native 0.85 + **Expo SDK 56** (expo-router, 파일 기반 라우팅)
- **Language**: TypeScript
- **State**: Zustand · **Server State**: TanStack Query
- **Auth**: Supabase Auth (Google OAuth)
- **Realtime(텍스트)**: `@stomp/stompjs` + `sockjs-client` (STOMP over WebSocket)
- **Realtime(음성)**: `react-native-webrtc` (Mesh P2P, 오디오 전용) · `react-native-incall-manager`
- **STT**: `expo-speech-recognition` (온디바이스 음성인식)
- **TTS**: `expo-speech` (온디바이스 음성 합성)
- **번역**: `@react-native-ml-kit/translate-text` (온디바이스 · 오프라인 · 무과금)
- **배포**: `expo-updates` (EAS OTA)

### 🖥️ Backend (`backend/`)
- **Framework**: Spring Boot 3.5
- **Language**: Kotlin (JVM 21)
- **DB / ORM**: MySQL 8 + JPA / Hibernate
- **Security**: Spring Security + **JWT** (jjwt) · Supabase 토큰 검증
- **Realtime**: Spring WebSocket — **STOMP 브로커** (`/ws`, `/topic`, `/queue`, `/app`)
- **AI**: Gemini API 클라이언트 — **회의 종료 후 AI 요약/액션아이템 생성**
- **API Docs**: springdoc-openapi (Swagger UI `/swagger-ui.html`)
- **View(테스트)**: Thymeleaf (웹소켓/회의방 테스트 페이지)

### ⚙️ Infrastructure
- **Build**: Gradle (backend) · npm/Expo (app)
- **CI/CD**: GitHub Actions — `deploy-dev.yml`, `deploy-prod.yml`, `eas-ota.yml`
- **미디어 릴레이**: STUN(Google) + TURN(coturn / OpenRelay) — NAT 통과용

## 🏗️ 프로그램 아키텍처

```
                            ┌───────────────────────────┐
                            │        onRing App          │
                            │  (React Native · Expo)     │
                            └─────────────┬─────────────┘
             로그인(Supabase / Google OAuth) · 회의 생성/코드 입장
                                          │
              ┌───────────── 회의방 입장 (WebSocket 연결) ─────────────┐
              │                                                         │
   [ 내 마이크 ]                                              [ 채팅 입력(농인) ]
        │  온디바이스 STT (expo-speech-recognition)                 │
        ▼                                                            ▼
   확정 텍스트 ──┐                                          텍스트 ──┐
                │        ┌──────────────────────────────────┐       │
                └───────▶│      Spring Boot · STOMP Broker    │◀──────┘
                         │  /topic/meetings/{id}      (자막·채팅) │
                         │  /topic/meetings/{id}/participants     │
                         │  /topic/meetings/{id}/signal (WebRTC)  │
                         └──────────────┬─────────────────────────┘
             ┌──────────────────────────┼───────────────────────────┐
             ▼                          ▼                            ▼
     [ 청인: 자막 표시 ]        [ 농인: 자막 표시 ]         [ 수신 텍스트 → TTS 발화 ]
     [ 온디바이스 ML Kit 번역으로 각자 언어 표시 ]            (expo-speech, 본인 메시지 제외)

        ▲                                                            ▲
        │        WebRTC Mesh (P2P · 오디오 전용, 시그널링=STOMP)      │
        └──────── 청인 ↔ 청인 실제 음성 통화 (STUN/TURN 경유) ────────┘

                         회의 종료
                            │
                            ▼
        ┌──────────────────────────────────────────────┐
        │  대화 전문 저장(MySQL) → AI 요약(Gemini)        │
        │  회의록 조회 · 내보내기(JSON / Markdown)         │
        └──────────────────────────────────────────────┘
```

- **텍스트 경로**: 마이크→온디바이스 STT / 채팅 입력 → **STOMP** 브로커 → 방 전체 브로드캐스트 → 수신 측에서 온디바이스 번역·자막·TTS.
- **음성 경로**: 청인 ↔ 청인은 **WebRTC Mesh(P2P, 오디오 전용, 최대 6인)** 로 실제 목소리 통화. 시그널링(offer/answer/ICE)은 STOMP `/signal` 토픽을 재사용.
- 두 경로는 서로 독립적이며, 회의 종료 시 저장된 대화를 기반으로 **Gemini가 요약**을 생성합니다.

## 🎯 주요 기능

- **실시간 회의방** — 회의 코드 생성/입장, 참여자 presence, 개설자 종료 권한
- **온디바이스 STT 자막** — 내 발화를 실시간 텍스트로 변환해 방 전체에 전달
- **채팅 → TTS** — 농인이 입력한 채팅을 청인 기기에서 음성으로 재생
- **WebRTC 음성 통화** — 청인 간 자연스러운 오디오 통화 (Mesh, 오디오 전용)
- **온디바이스 번역** — 한/일/중/영, ML Kit 오프라인 번역으로 각자 언어 표시
- **AI 회의 요약** — 회의 종료 후 Gemini가 요약·핵심 내용 정리
- **회의록** — 대화 전문 저장, 검색·즐겨찾기, JSON/Markdown 내보내기
- **소셜 로그인** — Supabase 기반 Google OAuth
- **접근성 설정** — 언어, 글씨 크기, 진동 등 사용자별 채팅 설정

## 📂 주요 구조

```
onRing/
├── app/
│   └── knou-app/            # React Native + Expo 앱 (onRing)
├── backend/                 # Spring Boot(Kotlin) API·STOMP 서버
├── docs/                    # 설계·기획 문서 (화면정의서, 구현계획, API 명세 등)
└── .github/workflows/       # CI/CD (deploy-dev, deploy-prod, eas-ota)
```

## 📁 패키지 구조

### Backend — `backend/src/main/kotlin/com/knou/api/`
```
com.knou.api
├── controller/      # REST 엔드포인트 (Auth·User·Meeting·Translation·TTS·Log ...)
├── service/         # 비즈니스 로직 (Meeting·MeetingSummary·Transcript·Translation·Auth·User)
├── repository/      # Spring Data JPA 리포지토리
├── entity/          # JPA 엔티티 (User·Meeting·MeetingAttendance·MeetingMessage)
├── dto/             # 요청/응답 DTO (auth·user·meeting·translation·common)
├── websocket/       # STOMP 컨트롤러·시그널링·presence·채팅 저장 리스너
├── security/        # JWT·Supabase·STOMP 인증 인터셉터·SecurityConfig
├── config/          # WebSocket·CORS·OpenAPI·Gemini·필터 설정
├── client/          # GeminiClient (AI 요약/번역)
├── logging/         # 인메모리 로그 수집·스트리밍
└── utils/           # 공통 유틸
```

### App — `app/knou-app/src/`
```
src
├── app/             # expo-router 라우트 ((tabs), login, auth/callback, meeting-done ...)
├── screens/         # 화면 단위 모듈 (home · meeting-room · notes · settings · privacy · meeting-summary)
├── components/      # 공용·UI 컴포넌트
├── lib/             # 도메인 로직
│   ├── stt/         #   온디바이스 음성인식 (live-stt)
│   ├── tts.ts       #   음성 합성 (expo-speech)
│   ├── webrtc/      #   Mesh 음성 통화·ICE 설정
│   ├── websocket.ts #   STOMP 클라이언트
│   ├── translate.ts #   온디바이스 ML Kit 번역
│   └── supabase.ts  #   Supabase 인증
├── store/           # Zustand 스토어 (auth·meeting·settings·ui)
├── hooks/ · constants/ · types/ · utils/
```

## 🚀 실행 방법

### 1. 사전 요구사항
- **JDK 21+**
- **Node.js 18+**
- **MySQL 8+**
- **Android SDK / Android Studio** (앱은 WebRTC·음성인식 네이티브 모듈을 쓰므로 **Expo Go가 아닌 dev client**로 실행)

### 2. 백엔드 실행 (`backend/`)
```bash
cd backend

# 1) 환경변수 준비 — .env.example 복사 후 값 채우기 (DB, Supabase, Gemini)
cp .env.example .env

# 2) DB 스키마 초기화
mysql -u <user> -p < src/main/resources/mySqlInit.sql

# 3) 로컬 프로파일로 실행 (기본 포트 8080)
./gradlew bootRun --args='--spring.profiles.active=local'
```
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- STOMP 엔드포인트: `ws://localhost:8080/ws`

### 3. 앱 실행 (`app/knou-app/`)
```bash
cd app/knou-app

# 1) 환경변수 준비 — .env.example 복사 (로컬 백엔드면 API/WS 줄 삭제 시 기본값 사용)
cp .env.example .env

# 2) 의존성 설치
npm install

# 3-a) 안드로이드 dev client 실행 (실기기·에뮬레이터)
npm run android      # = expo run:android

# 3-b) 웹 프리뷰 (WebRTC/음성 일부 기능 제한)
npm run web
```
> 안드로이드 에뮬레이터에서 호스트 PC 백엔드는 `10.0.2.2:8080` 으로 자동 매핑됩니다(`src/lib/config.ts`).

## 🔧 환경 변수

실제 키 값은 커밋하지 말고 각 `.env.example` 을 복사해 채웁니다.

**Backend (`backend/.env`)**

| 키 | 설명 |
|----|------|
| `DB_USERNAME` / `DB_PASSWORD` | MySQL 접속 계정 |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Google 로그인 토큰 검증 (anon/publishable key) |
| `GEMINI_API_KEY` | 회의 AI 요약용 Gemini 키 (`GEMINI_MODEL` 로 모델 지정 가능) |
| `JWT_SECRET` | 운영 배포 시 강한 값으로 주입 (로컬은 기본값) |

**App (`app/knou-app/.env`)** — `EXPO_PUBLIC_` 접두사만 앱에 노출됨

| 키 | 설명 |
|----|------|
| `EXPO_PUBLIC_API_BASE` | 백엔드 REST base URL |
| `EXPO_PUBLIC_WS_URL` | STOMP WebSocket URL (`.../ws`) |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase (publishable key 만) |

## 🔌 주요 API (일부)

| 메서드 · 경로 | 설명 |
|---------------|------|
| `POST /auth/login` | 소셜 로그인 → JWT 발급 |
| `GET /api/users/me` · `PATCH /api/users/me/profile` · `.../chat-settings` | 프로필·채팅 설정 |
| `POST /api/meetings` · `POST /api/meetings/join` | 회의 생성 / 코드 입장 |
| `GET /api/meetings/active` · `/recent` · `/{id}` | 진행중·최근·상세(AI 요약) 조회 |
| `GET /api/meetings/{id}/messages` · `/transcript` | 대화 전문 · 전사 조회 |
| `POST /api/translations` | 서버 번역(회의록 전사 탭 보조) |
| STOMP `/app/...` → `/topic/meetings/{id}` | 실시간 채팅·자막·시그널링 |

> 전체 명세는 [`docs/api-spec.md`](docs/api-spec.md) 및 Swagger UI 참고.

## 📚 문서

- [`docs/구현계획.md`](docs/구현계획.md) — 구현 로드맵
- [`docs/음성통화-접근성-회의-설계.md`](docs/음성통화-접근성-회의-설계.md) — WebRTC·STT·STOMP·TTS 파이프라인 설계
- [`docs/회의-AI요약-설계.md`](docs/회의-AI요약-설계.md) — AI 요약 설계
- [`docs/api-spec.md`](docs/api-spec.md) · [`docs/deployment-notes.md`](docs/deployment-notes.md) · [`docs/google-login-setup.md`](docs/google-login-setup.md)
- `docs/OnRing_화면정의서_v1.1.pdf` — 화면 정의서

## 🤝 기여 방법

1. 이슈로 논의 후 브랜치 생성 (`feat/*`, `fix/*`)
2. 변경 커밋 (명확한 메시지)
3. `dev` 브랜치로 Pull Request 생성

---

<div align="center">
  <b>onRing</b> — 언어의 장벽을 끄고, 소통의 링을 켜다 🔔
</div>

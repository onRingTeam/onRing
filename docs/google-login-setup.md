# 구글 로그인 (Supabase OAuth) 구축 정리

> onRing 앱에 구글 소셜 로그인을 붙인 작업 기록. 로컬 개발환경 세팅 + 프론트/백엔드 인증 구현 전체.
> (Notion 붙여넣기용 — 실제 비밀값은 포함하지 않음. 값은 `.env` 파일 / 팀 비밀 저장소 참고.)

---

## 1. 아키텍처 개요

Supabase 를 **"구글 로그인 창구"** 로만 사용한다. 사용자 데이터는 기존 MySQL(`onRingDb`) + 자체 백엔드(JWT)에 저장한다.

```
로그인화면 → 구글 로그인(Supabase OAuth) → Supabase 세션(access_token)
   → 백엔드 POST /auth/login (토큰 검증 → user 조회/생성 → 자체 JWT 발급)
   → 앱 auth-store 에 실제 userId + JWT 저장 → 홈 진입
   → 이후 모든 API 호출에 X-User-Id(dev) / Bearer JWT(운영) 로 신원 전달
```

**왜 토큰 교환(exchange)?** 백엔드가 이미 자체 JWT + `userId`(Long) 기반이라, 서버가
사용자를 구별하려면 `Supabase email → 백엔드 userId` 매핑이 필요하다. `user` 테이블의
`email`(unique) 을 매핑 키로 사용한다.

---

## 2. 로컬 개발환경 구성

앱(프론트)만 볼 거면 원격 서버를 쓰므로 백엔드/터널 불필요. **백엔드까지 로컬로 돌릴 때만** 아래가 필요하다.

| 포트 | 구성요소 | 실행 방법 |
|---|---|---|
| 13306 | cloudflared DB 터널 | `cloudflared access tcp --hostname devKnouDb.shinlabs.app --url 127.0.0.1:13306` |
| 8080 | 백엔드 (Spring Boot) | `backend` 에서 `./gradlew bootRun` |
| 8081 | 프론트 Metro (Expo) | `app/knou-app` 에서 `npx expo start` |

- **DB 접속**: `application-local.yml` 이 `127.0.0.1:13306/onRingDb` 를 바라봄 → cloudflared 터널 필수.
- **에뮬레이터 → 로컬 백엔드**: 안드로이드 에뮬레이터는 호스트PC를 `10.0.2.2` 로 접근.
  그래서 프론트 `.env.local` 의 API base 를 `http://10.0.2.2:8080` 으로 오버라이드.

---

## 3. 프론트엔드 구현 (Expo / React Native)

### 설치한 라이브러리
`@supabase/supabase-js`, `@react-native-async-storage/async-storage`,
`react-native-url-polyfill`, `expo-auth-session`, `expo-crypto`
(`expo-web-browser` 는 기존 설치됨)

### 추가/수정 파일
| 파일 | 역할 |
|---|---|
| `src/lib/supabase.ts` | Supabase 클라이언트 (AsyncStorage 세션 저장, PKCE flow) |
| `src/lib/auth.ts` | 구글 로그인 / 세션 복구 / 백엔드 토큰교환 / 로그아웃 오케스트레이션 |
| `src/lib/api-headers.ts` | 인증 헤더 생성 (X-User-Id / Bearer) |
| `src/app/login.tsx` | 로그인 화면 (구글 버튼) |
| `src/app/_layout.tsx` | 인증 게이트 (미로그인 → `/login`, 세션 복구) |
| `src/store/auth-store.ts` | 세션 기반으로 교체 (하드코딩 데모유저 제거) |
| `src/screens/settings/settings-screen.tsx` | 로그아웃 버튼 추가 |
| `src/lib/config.ts`, `src/lib/websocket.ts` | `EXPO_PUBLIC_*` env 오버라이드 지원 |
| `src/screens/home/api.ts` | 하드코딩 userId → 실제 로그인 userId 로 교체 |

### 딥링크 콜백
- OAuth 복귀 주소는 `makeRedirectUri({ scheme: 'knouapp', path: 'auth/callback' })`.
- **dev build**: `knouapp://auth/callback` (안정적, 실무 권장)
- **Expo Go**: `exp://<PC-IP>:8081/...` (환경마다 달라짐 → Supabase Redirect URLs 에 매번 등록 필요)

---

## 4. 백엔드 구현 (Spring Boot / Kotlin)

### 추가/수정 파일
| 파일 | 역할 |
|---|---|
| `controller/AuthController.kt` | `POST /auth/login` 엔드포인트 |
| `service/AuthService.kt` | Supabase 토큰 검증 → `findByEmail` or 신규 생성 → JWT 발급 |
| `dto/auth/AuthDtos.kt` | `LoginRequest` / `LoginResponse` |
| `security/SupabaseProperties.kt` | `supabase.*` 설정 바인딩 |
| `security/SecurityConfig.kt` | 운영 체인에서 `/auth/login` 공개 처리 |
| `resources/application.yml` | `supabase.url` / `supabase.anon-key` 추가 |

### `POST /auth/login`
- 요청: `{ "accessToken": "<Supabase access_token>" }`
- 처리:
  1. `GET {supabase.url}/auth/v1/user` 로 토큰 검증 (헤더: `Authorization: Bearer`, `apikey`)
  2. `email` 로 회원 조회, 없으면 생성 (`language=KO`, `fontSize=MEDIUM` 기본값)
  3. `JwtTokenProvider.createToken(userId)` 로 백엔드 JWT 발급
- 응답: `{ userId, token, email, name }`
- 검증 결과: 잘못된 토큰 → **401** (동작 확인 완료)

### 참고 — 신규 유저 기본값
`user` 테이블의 `language`, `font_size` 는 NOT NULL 이고 DB 기본값이 없어서,
첫 로그인 시 코드에서 `KO` / `MEDIUM` 을 채워 생성한다.

---

## 5. 외부 서비스 설정 (Supabase / Google Cloud)

### Supabase 대시보드
1. **Authentication → Providers → Google**: 활성화(Enable)
2. **Client IDs / Client Secret**: Google Cloud 에서 발급받은 실제 값 등록
   - Client ID 형식: `...apps.googleusercontent.com`
   - Client Secret 형식: `GOCSPX-...`
3. **Authentication → URL Configuration → Redirect URLs**: 앱 콜백 주소 등록
   - `knouapp://**`
   - (Expo Go 사용 시) 로그에 찍히는 `exp://...` 주소도 추가

### Google Cloud Console
1. **API 및 서비스 → OAuth 동의 화면**: 외부(External), 앱 이름/이메일 설정
2. **사용자 인증 정보 → OAuth 클라이언트 ID → 웹 애플리케이션**
3. **승인된 리디렉션 URI**: Supabase 콜백 주소 등록
   `https://<project-ref>.supabase.co/auth/v1/callback`

> ⚠️ 흔한 실수: Client ID/Secret 자리에 DB 계정 같은 임의 문자열 입력 → "Invalid characters" 에러.
> 반드시 Google Cloud 에서 발급받은 실제 값을 넣을 것.

---

## 6. 환경변수 (.env)

> 실제 값은 git 에 올리지 않는다(gitignore). 아래는 **키 이름과 형식**만 정리.

### `app/knou-app/.env.local` (프론트)
```
EXPO_PUBLIC_API_BASE=http://10.0.2.2:8080        # 로컬 백엔드(에뮬레이터 기준)
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:8080/ws
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx  # publishable(anon) key
```

### `backend/.env` (백엔드)
```
DB_USERNAME=xxx
DB_PASSWORD=xxx
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxx
```

---

## 7. 새 환경에서 셋업하는 순서 (clone 후)

1. `backend/.env` 생성 (DB 계정 + Supabase URL/anon key)
2. `app/knou-app/.env.local` 생성 (API base + Supabase URL/anon key)
3. cloudflared 설치 후 터널 실행 (13306)
4. `backend`: `./gradlew bootRun`
5. `app/knou-app`: `npm install` → `npx expo start -c`
6. Supabase Redirect URLs 에 현재 환경의 콜백 주소 등록
7. 에뮬레이터에서 구글 로그인 테스트

> **주의**: `.env` 파일은 git 으로 전달되지 않으므로 값은 별도 공유. Supabase 프로젝트 자체는
> 클라우드에 하나뿐이라 같은 URL/키를 쓰면 모두 같은 서버·DB 를 공유한다.

---

## 8. 보안 — git 분류

| 정보 | 분류 |
|---|---|
| DB 비밀번호 | 🔴 gitignore |
| Supabase service_role key | 🔴 gitignore (프로젝트에서 미사용) |
| Google Client Secret | 🔴 gitignore |
| JWT_SECRET (운영) | 🔴 gitignore |
| `backend/.env`, `.env.local` | 🔴 gitignore (설정됨) |
| Supabase Project URL | 🟢 공개 무방 |
| Publishable(anon) key | 🟢 공개 무방 (앱에 심는 공개키) |
| Google Client ID | 🟢 공개 무방 |
| Callback / Redirect URL | 🟢 공개 무방 |

---

## 9. 남은 작업 / TODO

- [ ] 에뮬레이터에서 실제 구글 로그인 1회 검증 (Supabase Redirect URL 등록 후)
- [ ] Expo Go 딥링크 불안정 시 **dev build** 로 전환 (`expo-dev-client`)
- [ ] 운영 프로파일에서 JWT 필터 경로로 인증 검증 (dev 는 X-User-Id 로 식별 중)
- [ ] `.env.example` 커밋 (clone 시 필요한 키 안내용)
- [ ] 회원 프로필 화면(설정 6-a) 실제 데이터 연동

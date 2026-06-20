# 배포 메모

홈서버(Tailscale/Cloudflare) + self-hosted GitHub Actions runner 기반 CI/CD 관련 향후 작업 메모.

## 현재 구성 요약

- self-hosted runner가 `main`/`dev` 브랜치 push 시 빌드 → jar를 환경별 폴더로 복사 → systemd 재시작
- prod: `~/app/knou-prod`, 서비스 `knou-prod`, 포트 9999, 프로파일 `prod`
- dev: `~/app/knou-dev`, 서비스 `knou-dev`, 포트 19999, 프로파일 `dev`
- 배포 jar 이름: `knou-api-{prod|dev}-<커밋SHA>.jar`, `app.jar` 심볼릭 링크로 최신 가리킴
- dev는 Cloudflare 터널로 외부 접근, IP 화이트리스트로 본인/팀원만 허용

---

## TODO: DB 환경변수 설정 (MySQL/JPA 활성화 시)

현재 `build.gradle`에서 JPA/MySQL 의존성이 주석 처리됨(`spring-boot-starter-data-jpa`, `mysql-connector-j`). 그래서 `application-*.yml`의 `spring.datasource` / `spring.jpa` 설정은 무시되고, DB 환경변수 없이도 앱이 뜬다.

나중에 DB 붙일 때 — 직접 칠 명령어 그대로:

**1) `build.gradle`에서 두 의존성 주석 해제**
```gradle
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
runtimeOnly 'com.mysql:mysql-connector-j'
```

**2) dev env 파일 생성 (홈서버)**
```bash
vi /home/minhyeok/app/knou-dev/.env
```
내용:
```
DB_USERNAME=knou
DB_PASSWORD=비밀번호
```
권한:
```bash
chmod 600 /home/minhyeok/app/knou-dev/.env
```

**3) prod env 파일 생성 (홈서버)**
```bash
vi /home/minhyeok/app/knou-prod/.env
```
내용:
```
DB_HOST=DB호스트
DB_USERNAME=knou
DB_PASSWORD=비밀번호
```
권한:
```bash
chmod 600 /home/minhyeok/app/knou-prod/.env
```

**4) systemd 서비스에 EnvironmentFile 추가 (`[Service]` 섹션에 한 줄)**
```bash
sudo vi /etc/systemd/system/knou-dev.service
# [Service] 아래에 추가:  EnvironmentFile=/home/minhyeok/app/knou-dev/.env

sudo vi /etc/systemd/system/knou-prod.service
# [Service] 아래에 추가:  EnvironmentFile=/home/minhyeok/app/knou-prod/.env
```

**5) 반영**
```bash
sudo systemctl daemon-reload
sudo systemctl restart knou-dev knou-prod
```

> `.env`는 git에 올리지 말 것 (`.gitignore`에 추가).
> dev DB: `localhost:3306/knou_dev`, prod DB: `${DB_HOST}:3306/knou_prod`

---

## TODO: 운영 무중단 배포 (Blue-Green)

현재는 `systemctl restart`라 배포 시 수~수십 초 다운타임 있음. 나중에 **운영(prod)만** WAS 2개로 분리해 Blue-Green 무중단 배포 적용. 개발(dev)은 단순 재시작 유지.

필요한 작업:
- systemd 서비스 운영용 2개로 분리 (`knou-prod-blue`=9998 / `knou-prod-green`=9999), 각자 `app-blue.jar` / `app-green.jar` 바라보게
- 리버스 프록시 설치 (nginx 또는 Caddy 미정) — 단일 포트로 받아 활성 인스턴스로 전달, `Cloudflare Tunnel → 프록시 → blue/green` 흐름
- sudoers에 `knou-prod-blue`, `knou-prod-green`, `nginx` reload 권한 추가
- 헬스체크용 actuator 의존성 추가 (`spring-boot-starter-actuator`, `/actuator/health`)
- `deploy-prod.yml`을 blue-green 스위치 스크립트로 교체: 놀고있는 색에 새 jar 띄움 → 헬스체크 통과 대기 → 프록시 전환 → 옛 인스턴스 종료
- 앱 비즈니스 로직은 변경 불필요

---

## TODO: 홈서버 이전/장애 시 클라우드 수동 우회

홈서버를 옮기거나 장애로 죽었을 때, NCP/AWS 인스턴스에 임시로 올리고 origin만 클라우드로 수동 전환. 평소엔 클라우드 안 띄워서 상시 비용 0.

> 전제: 자동 failover(Cloudflare Load Balancer)는 유료라 안 씀. **수동 전환** 방식.
> DB를 Firebase 등 외부 매니지드로 빼두면 홈/클라우드가 같은 DB를 봐서 우회가 깔끔함 (로컬 MySQL이면 우회 시 DB 접근 끊기니 주의).

전환 절차:
1. 클라우드 인스턴스 생성 → JDK 21 설치 (`sudo apt install -y openjdk-21-jdk`)
2. systemd 서비스 셋업 (위 "현재 구성 요약"/홈서버 셋업과 동일하게 `knou-prod` 등록, 포트/프로파일 동일)
3. 최신 jar 배포:
   - 빠른 방법: 로컬에서 `./gradlew bootJar` 후 `scp build/libs/knou-api-*.jar 클라우드:/.../app.jar`
   - 또는 클라우드에 self-hosted runner 하나 더 설치(라벨 구분)해서 자동배포
4. Cloudflare에서 origin을 클라우드로 전환 (둘 중 하나):
   - **터널 방식**: 클라우드에 cloudflared 설치 → 같은 터널/새 터널에 연결하고 ingress를 클라우드 origin으로
   - **DNS 방식**: `prodKnou`/`devKnou` A 레코드를 클라우드 공인 IP로 변경 (이 경우 IP 화이트리스트가 CF-Connecting-IP 대신 어떻게 동작하는지 점검 필요)
5. 홈서버 복구되면 origin을 다시 홈서버로 되돌리고, 클라우드 인스턴스 내림(비용 절감)

권장: 자동 failover가 꼭 필요해지면 그때 Cloudflare Load Balancer(유료, health check 기반 home→cloud 자동 전환) 검토.

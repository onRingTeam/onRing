/* =========================================================================
 * onRingDb - 초기 테이블 생성 스크립트 (MySQL 8.x / utf8mb4)
 *
 * [설계]
 *  회원(user)
 *    - 회원 ID [PK] / 이메일 / 회원명 / 언어(공통코드) / 글씨 크기(공통코드) / 진동설정(Y/N) / 그룹코드
 *  회의(meeting)
 *    - 회의 ID [PK] / 회의명 / 회의 날짜 / 회의 코드[unique] / 요약내용 / 회의 소요 시간 / 상태(진행중/종료)
 *  회의 참석(meeting_attendance)
 *    - 회의 참석 ID [PK] / 회의 ID [FK] / 회원 ID [FK] / 즐겨찾기 여부(Y/N)
 *      / 사용 여부(Y/N, 사용자별 회의록 삭제) / 액션아이템 / 발화빈도수 / 번역 언어 / BM ID / 개설여부(Y/N)
 *  회의 대화(meeting_message)
 *    - 메시지 ID [PK] / 회의 ID [FK] / 발화자 회원 ID / 발화자명 / 발화 시각 / 원문 / 번역문
 *      (종료된 회의의 전체 대화 조회용 — 상세회의 '전체 대화' 탭)
 * ========================================================================= */

-- ----------------------------------------------------------------------------
-- 기존 테이블 삭제 (자식 → 부모 순서)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS meeting_message;
DROP TABLE IF EXISTS meeting_attendance;
DROP TABLE IF EXISTS meeting;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS comm_dt;
DROP TABLE IF EXISTS comm_mt;

-- ----------------------------------------------------------------------------
-- 1. 메인 공통 코드 (Comm_mt)
-- ----------------------------------------------------------------------------
CREATE TABLE comm_mt (
    main_cd      VARCHAR(30)  NOT NULL                COMMENT '메인 코드',
    main_cd_nm   VARCHAR(100) NOT NULL                COMMENT '메인 코드 명',
    description  VARCHAR(500) NULL                    COMMENT '설명',
    created_by   VARCHAR(100) NOT NULL DEFAULT 'SYSTEM' COMMENT '생성자명',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                     COMMENT '생성일시',
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    PRIMARY KEY (main_cd)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '메인 공통 코드';

-- ----------------------------------------------------------------------------
-- 2. 서브 공통 코드 (Comm_dt)
-- ----------------------------------------------------------------------------
CREATE TABLE comm_dt (
    sub_cd       VARCHAR(30)  NOT NULL                COMMENT '서브 코드',
    main_cd      VARCHAR(30)  NOT NULL                COMMENT '메인 코드 FK',
    sub_cd_nm    VARCHAR(100) NOT NULL                COMMENT '서브 코드 명',
    description  VARCHAR(500) NULL                    COMMENT '설명',
    created_by   VARCHAR(100) NOT NULL DEFAULT 'SYSTEM' COMMENT '생성자명',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                     COMMENT '생성일시',
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    PRIMARY KEY (sub_cd, main_cd),
    CONSTRAINT fk_comm_dt_main_cd FOREIGN KEY (main_cd) REFERENCES comm_mt (main_cd)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '서브 공통 코드';

-- ----------------------------------------------------------------------------
-- 3. 회원
-- ----------------------------------------------------------------------------
CREATE TABLE `user` (
    user_id      BIGINT       NOT NULL AUTO_INCREMENT COMMENT '회원 ID',
    email        VARCHAR(255) NOT NULL                COMMENT '이메일',
    name         VARCHAR(100) NOT NULL                COMMENT '회원명',
    language     VARCHAR(30)  NOT NULL                COMMENT '언어 (공통코드)',
    font_size    VARCHAR(30)  NOT NULL                COMMENT '글씨 크기 (공통코드)',
    vibration_yn CHAR(1)      NOT NULL DEFAULT 'N'    COMMENT '진동설정 Y/N',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                     COMMENT '생성일시',
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    group_cd     VARCHAR(30)  NULL COMMENT '그룹코드',
    PRIMARY KEY (user_id),
    UNIQUE KEY uk_user_email (email),
    CONSTRAINT ck_user_vibration_yn CHECK (vibration_yn IN ('Y', 'N'))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '회원';

-- ----------------------------------------------------------------------------
-- 4. 회의
-- ----------------------------------------------------------------------------
CREATE TABLE meeting (
    meeting_id   BIGINT       NOT NULL AUTO_INCREMENT COMMENT '회의 ID',
    title        VARCHAR(200) NOT NULL                COMMENT '회의명',
    meeting_date DATETIME     NOT NULL                COMMENT '회의 날짜',
    meeting_code VARCHAR(50)  NOT NULL                COMMENT '회의 코드',
    summary      TEXT         NULL                    COMMENT '요약내용',
    duration_sec INT          NULL                    COMMENT '회의 소요 시간(초)',
    status       VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS' COMMENT '상태: IN_PROGRESS(진행중) / ENDED(종료)',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                     COMMENT '생성일시',
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    PRIMARY KEY (meeting_id),
    UNIQUE KEY uk_meeting_code (meeting_code),
    CONSTRAINT ck_meeting_status CHECK (status IN ('IN_PROGRESS', 'ENDED'))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '회의';

-- ----------------------------------------------------------------------------
-- 5. 회의 참석 (회의 N : M 회원)
-- ----------------------------------------------------------------------------
CREATE TABLE meeting_attendance (
    attendance_id      BIGINT      NOT NULL AUTO_INCREMENT COMMENT '회의 참석 ID',
    meeting_id         BIGINT      NOT NULL                COMMENT '회의 ID',
    user_id            BIGINT      NOT NULL                COMMENT '회원 ID',
    favorite_yn        CHAR(1)     NOT NULL DEFAULT 'N'    COMMENT '즐겨찾기 여부 Y/N',
    use_yn             CHAR(1)     NOT NULL DEFAULT 'Y'    COMMENT '사용 여부 Y/N (N=사용자가 회의록 삭제)',
    action_item        TEXT        NULL                    COMMENT '액션아이템',
    speech_count       INT         NOT NULL DEFAULT 0      COMMENT '발화빈도수',
    translate_language VARCHAR(30) NULL                    COMMENT '번역 언어 (채팅 당시 유저가 선택한 언어)',
    bm_id              BIGINT      NULL                    COMMENT 'BM ID',
    created_at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP                     COMMENT '생성일시',
    updated_at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    iscreated          CHAR(1)     NOT NULL DEFAULT 'N'    COMMENT '개설여부',
    PRIMARY KEY (attendance_id),
    UNIQUE KEY uk_attendance_meeting_user (meeting_id, user_id),
    KEY idx_attendance_user (user_id),
    CONSTRAINT fk_attendance_meeting FOREIGN KEY (meeting_id) REFERENCES meeting (meeting_id),
    CONSTRAINT fk_attendance_user    FOREIGN KEY (user_id)    REFERENCES `user` (user_id),
    CONSTRAINT ck_attendance_favorite_yn CHECK (favorite_yn IN ('Y', 'N')),
    CONSTRAINT ck_attendance_use_yn      CHECK (use_yn IN ('Y', 'N'))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '회의 참석';

-- ----------------------------------------------------------------------------
-- 6. 회의 대화 (종료된 회의의 전체 발화 기록)
-- ----------------------------------------------------------------------------
CREATE TABLE meeting_message (
    message_id   BIGINT       NOT NULL AUTO_INCREMENT COMMENT '메시지 ID',
    meeting_id   BIGINT       NOT NULL                COMMENT '회의 ID',
    user_id      BIGINT       NOT NULL                COMMENT '발화자 회원 ID (FK 아님 — 참석 기록 없는 발화자도 허용)',
    speaker_name VARCHAR(100) NOT NULL                COMMENT '발화자명 (발화 시점 비정규화)',
    spoken_at    DATETIME     NOT NULL                COMMENT '발화 시각',
    original     TEXT         NOT NULL                COMMENT '원문',
    translated   TEXT         NULL                    COMMENT '번역문 (현재 미사용 — 번역 기능 대비)',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    PRIMARY KEY (message_id),
    KEY idx_meeting_message_meeting_spoken (meeting_id, spoken_at),
    CONSTRAINT fk_meeting_message_meeting FOREIGN KEY (meeting_id) REFERENCES meeting (meeting_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '회의 대화';


-- ============================================================================
-- 초기 데이터 설정 (공통코드)
-- ============================================================================

-- 메인 공통코드 입력 (언어)
INSERT INTO comm_mt (main_cd, main_cd_nm, description, created_by)
VALUES ('C0001', '언어', '시스템 사용 및 번역 대상 언어 정의', 'SYSTEM');

-- 서브 공통코드 입력 (한국어, 영어, 일본어, 중국어)
INSERT INTO comm_dt (sub_cd, main_cd, sub_cd_nm, description, created_by) VALUES
('KR',  'C0001', '한국어', 'korean',   'SYSTEM'),
('ENG', 'C0001', '영어',   'english',  'SYSTEM'),
('JP',  'C0001', '일본어', 'japanese', 'SYSTEM'),
('CHI', 'C0001', '중국어', 'chinese',  'SYSTEM');
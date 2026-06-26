/* =========================================================================
 * onRingDb - 초기 테이블 생성 스크립트 (MySQL 8.x / utf8mb4)
 *
 * [설계]
 *  회원(user)
 *    - 회원 ID [PK] / 이메일 / 회원명 / 언어(공통코드) / 글씨 크기(공통코드) / 진동설정(Y/N)
 *  회의(meeting)
 *    - 회의 ID [PK] / 회의명 / 회의 날짜 / 회의 코드[unique] / 요약내용 / 회의 소요 시간 / 상태(진행중/종료)
 *  회의 참석(meeting_attendance)
 *    - 회의 참석 ID [PK] / 회의 ID [FK] / 회원 ID [FK] / 즐겨찾기 여부(Y/N)
 *      / 액션아이템 / 발화빈도수 / 번역 언어 / BM ID
 * ========================================================================= */

-- ----------------------------------------------------------------------------
-- 기존 테이블 삭제 (자식 → 부모 순서)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS meeting_attendance;
DROP TABLE IF EXISTS meeting;
DROP TABLE IF EXISTS `user`;

-- ----------------------------------------------------------------------------
-- 회원
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
    PRIMARY KEY (user_id),
    UNIQUE KEY uk_user_email (email),
    CONSTRAINT ck_user_vibration_yn CHECK (vibration_yn IN ('Y', 'N'))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '회원';

-- ----------------------------------------------------------------------------
-- 회의
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
-- 회의 참석 (회의 N : M 회원)
-- ----------------------------------------------------------------------------
CREATE TABLE meeting_attendance (
    attendance_id      BIGINT      NOT NULL AUTO_INCREMENT COMMENT '회의 참석 ID',
    meeting_id         BIGINT      NOT NULL                COMMENT '회의 ID',
    user_id            BIGINT      NOT NULL                COMMENT '회원 ID',
    favorite_yn        CHAR(1)     NOT NULL DEFAULT 'N'    COMMENT '즐겨찾기 여부 Y/N',
    action_item        TEXT        NULL                    COMMENT '액션아이템',
    speech_count       INT         NOT NULL DEFAULT 0      COMMENT '발화빈도수',
    translate_language VARCHAR(30) NULL                    COMMENT '번역 언어 (채팅 당시 유저가 선택한 언어)',
    bm_id              BIGINT      NULL                    COMMENT 'BM ID',
    created_at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP                     COMMENT '생성일시',
    updated_at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    PRIMARY KEY (attendance_id),
    UNIQUE KEY uk_attendance_meeting_user (meeting_id, user_id),
    KEY idx_attendance_user (user_id),
    CONSTRAINT fk_attendance_meeting FOREIGN KEY (meeting_id) REFERENCES meeting (meeting_id),
    CONSTRAINT fk_attendance_user    FOREIGN KEY (user_id)    REFERENCES `user` (user_id),
    CONSTRAINT ck_attendance_favorite_yn CHECK (favorite_yn IN ('Y', 'N'))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '회의 참석';
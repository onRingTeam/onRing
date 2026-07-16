/* =========================================================================
 * onRingDb - 회의 참석 use_yn 컬럼 추가 스크립트 (2026-07-07)
 *
 * 목적
 *  회의록 화면 사용자별 삭제 기능 지원
 *   - meeting_attendance 에 use_yn(사용 여부) 컬럼 추가
 *   - 사용자가 회의록을 삭제하면 본인 참석 레코드만 use_yn='N' 으로 갱신
 *   - 회의록 목록/최근 회의 조회 시 use_yn='Y' 인 것만 노출
 *  (신규 DB는 mySqlInit.sql 에 이미 포함 — 이 스크립트는 기존 DB 반영용)
 *
 * 실행: mysql onRingDb < 2026-07-07-add-attendance-use-yn.sql
 * ========================================================================= */

ALTER TABLE meeting_attendance
    ADD COLUMN use_yn CHAR(1) NOT NULL DEFAULT 'Y' COMMENT '사용 여부 Y/N (N=사용자가 회의록 삭제)' AFTER favorite_yn,
    ADD CONSTRAINT ck_attendance_use_yn CHECK (use_yn IN ('Y', 'N'));

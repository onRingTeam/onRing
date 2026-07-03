/* =========================================================================
 * onRingDb - 회의/회의록 데이터 정리 스크립트 (2026-07-03)
 *
 * 목적
 *  1) 홈 「회의 시작」 버튼 오작동 원인 제거
 *     - 종료되지 않고 남아있던 IN_PROGRESS 회의를 ENDED 로 정리
 *       (active 조회가 계속 회의를 반환해 confirm 이 항상 뜨던 문제)
 *  2) 회의록 데이터 정리
 *     - 로그인 유저당 가장 최근 회의 1건만 남기고 나머지 참석 기록 삭제
 *     - 참석자가 모두 사라진(고아) 회의 행도 함께 삭제
 *  3) 상세회의 화면 확인용 임시 데이터(요약/액션아이템/발화빈도) 시드
 *
 * 실행: mysql onRingDb < 2026-07-03-meeting-data-cleanup.sql
 * ========================================================================= */

START TRANSACTION;

-- ----------------------------------------------------------------------------
-- 1) 진행중(IN_PROGRESS) 회의 → 종료(ENDED) 처리
--    (홈 회의 생성 버튼이 항상 "진행 중인 회의" confirm 을 띄우던 원인)
-- ----------------------------------------------------------------------------
UPDATE meeting
   SET status = 'ENDED',
       duration_sec = COALESCE(duration_sec, TIMESTAMPDIFF(SECOND, meeting_date, NOW()))
 WHERE status = 'IN_PROGRESS';

-- ----------------------------------------------------------------------------
-- 2-a) 유저당 가장 최근 회의 1건만 남기고 나머지 참석 기록 삭제
--      (meeting_date 최신순, 동률 시 attendance_id 큰 것 유지)
-- ----------------------------------------------------------------------------
DELETE a
  FROM meeting_attendance a
  JOIN (
        SELECT a2.attendance_id,
               ROW_NUMBER() OVER (
                   PARTITION BY a2.user_id
                   ORDER BY m2.meeting_date DESC, a2.attendance_id DESC
               ) AS rn
          FROM meeting_attendance a2
          JOIN meeting m2 ON m2.meeting_id = a2.meeting_id
       ) r ON r.attendance_id = a.attendance_id
 WHERE r.rn > 1;

-- ----------------------------------------------------------------------------
-- 2-b) 참석자가 모두 사라진(고아) 회의 행 삭제
-- ----------------------------------------------------------------------------
DELETE m
  FROM meeting m
  LEFT JOIN meeting_attendance a ON a.meeting_id = m.meeting_id
 WHERE a.attendance_id IS NULL;

-- ----------------------------------------------------------------------------
-- 3) 상세회의 확인용 임시 데이터 시드
--    남은 회의: 12(단독), 8(2인 공유) — 요약/액션아이템/발화빈도/번역언어 채움
-- ----------------------------------------------------------------------------
-- 회의 12 (단독 참석)
UPDATE meeting
   SET summary = '이번 회의에서는 다음 스프린트 범위를 확정하고, 홈 화면 회의 생성 플로우와 회의록 즐겨찾기 UX 개선안을 논의했습니다. 진행중 회의 판단을 서버 조회 기준으로 통일하기로 결정했습니다.',
       duration_sec = 1620
 WHERE meeting_id = 12;

UPDATE meeting_attendance a
  JOIN meeting m ON m.meeting_id = a.meeting_id
   SET a.action_item = '회의 생성 버튼 플로우 QA 및 진행중 회의 종료 처리 담당',
       a.speech_count = 18,
       a.translate_language = 'KO'
 WHERE m.meeting_id = 12;

-- 회의 8 (2인 공유) — 요약
UPDATE meeting
   SET summary = '다국어 회의 테스트 세션으로, 실시간 번역 품질과 화자 분리 정확도를 점검했습니다. 한국어·영어 혼합 발화에서 발생하는 번역 지연을 개선 과제로 도출했습니다.',
       duration_sec = 1830
 WHERE meeting_id = 8;

-- 회의 8 참석자별 액션아이템/발화빈도/번역언어 (user_id 2 = KO, user_id 3 = EN)
UPDATE meeting_attendance a
  JOIN meeting m ON m.meeting_id = a.meeting_id
   SET a.action_item = '실시간 번역 지연 구간 로그 수집 및 원인 분석',
       a.speech_count = 22,
       a.translate_language = 'KO'
 WHERE m.meeting_id = 8 AND a.user_id = 2;

UPDATE meeting_attendance a
  JOIN meeting m ON m.meeting_id = a.meeting_id
   SET a.action_item = 'Improve speaker diarization accuracy for overlapping speech',
       a.speech_count = 14,
       a.translate_language = 'EN'
 WHERE m.meeting_id = 8 AND a.user_id = 3;

COMMIT;

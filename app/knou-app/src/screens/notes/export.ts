import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import type { MeetingDetail } from '@/types/meeting';
import { formatDuration, formatMeetingDate } from '@/utils/meeting-format';

/** 사용자 입력 문자열이 HTML 로 해석되지 않도록 이스케이프. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 파일명에 못 쓰는 문자 제거 (Windows/Android/iOS 공통 금지 문자). */
function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || '회의록';
}

/** MeetingDetail → 내보내기용 PDF HTML 문서. */
function buildMeetingHtml(detail: MeetingDetail): string {
  const title = escapeHtml(detail.title);
  const date = escapeHtml(formatMeetingDate(detail.meetingDate));
  const duration = escapeHtml(formatDuration(detail.durationSec));
  const participants =
    detail.speakers.length > 0
      ? escapeHtml(detail.speakers.map((s) => s.name).join(', '))
      : `${detail.participantCount}명`;

  const summary = detail.summary
    ? `<p class="body">${escapeHtml(detail.summary)}</p>`
    : '<p class="body empty">AI 요약이 아직 없습니다.</p>';

  const actionItems = detail.speakers.filter((s) => !!s.actionItem);
  const actionList =
    actionItems.length > 0
      ? `<ol class="actions">${actionItems
          .map(
            (s) =>
              `<li><span class="who">${escapeHtml(s.name)}</span> ${escapeHtml(s.actionItem ?? '')}</li>`,
          )
          .join('')}</ol>`
      : '<p class="body empty">액션 아이템이 없습니다.</p>';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, 'Malgun Gothic', sans-serif; color: #1c1c1e; margin: 48px; }
  h1 { font-size: 22px; margin: 0 0 8px; color: #1A3461; }
  .meta { font-size: 12px; color: #6b7280; margin: 0 0 4px; }
  .meta b { color: #374151; font-weight: 600; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
  h2 { font-size: 14px; margin: 24px 0 8px; color: #2D67C8; }
  .body { font-size: 12px; line-height: 1.7; margin: 0; white-space: pre-wrap; }
  .empty { color: #9ca3af; }
  .actions { font-size: 12px; line-height: 1.7; margin: 0; padding-left: 20px; }
  .actions .who { font-weight: 700; color: #1A3461; margin-right: 4px; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta"><b>날짜</b> ${date} &nbsp;·&nbsp; <b>회의시간</b> ${duration}</p>
  <p class="meta"><b>참여자</b> ${participants}</p>
  <hr />
  <h2>요약 내용</h2>
  ${summary}
  <h2>액션 아이템</h2>
  ${actionList}
</body>
</html>`;
}

/**
 * 상세회의를 PDF 로 만들어 OS 공유 시트로 내보낸다.
 * 제목/날짜/참여자/요약/액션아이템/회의시간 포함. (헤더 내보내기 버튼)
 *
 * printToFileAsync 는 임의 파일명(cache 내 uuid.pdf)을 주므로, 공유 시트·수신 앱에
 * 의미 있는 이름이 보이도록 `회의제목_YYYY.MM.DD.pdf` 로 옮긴 뒤 공유한다.
 */
export async function exportMeetingPdf(detail: MeetingDetail): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: buildMeetingHtml(detail) });

  const fileName = `${sanitizeFileName(detail.title)}_${formatMeetingDate(detail.meetingDate)}.pdf`;
  const dest = new File(Paths.cache, fileName);
  if (dest.exists) dest.delete(); // 같은 회의 재내보내기 → 이전 파일 교체
  new File(uri).move(dest);

  await Sharing.shareAsync(dest.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: '회의록 내보내기',
  });
}

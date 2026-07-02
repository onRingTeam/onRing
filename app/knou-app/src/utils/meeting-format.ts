import type { BackendLang } from '@/types/meeting';

/** ISO LocalDateTime 문자열(예 "2026-06-26T14:00:00") → "2026.06.26". */
export function formatMeetingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** 초 → "52분" / "1시간 12분" / "42초". null이면 "-". */
export function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return '-';
  if (sec < 60) return `${sec}초`;
  const totalMin = Math.floor(sec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  return `${m}분`;
}

/** 백엔드 언어 코드 → 한 글자 뱃지. */
export const LANG_BADGE: Record<BackendLang, string> = {
  KO: '한',
  EN: 'En',
  JA: '日',
  ZH: '中',
};

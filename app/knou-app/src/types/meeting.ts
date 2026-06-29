export type LangCode = 'ko' | 'en' | 'ja' | 'zh';

export interface Speaker {
  id: string;
  name: string;
  language: LangCode;
}

export interface CaptionItem {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: number;
}

export interface MeetingRecord {
  id: string;
  title: string;
  code: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds: number;
  speakers: Speaker[];
  captions: CaptionItem[];
  summary?: string;
  language: LangCode;
}

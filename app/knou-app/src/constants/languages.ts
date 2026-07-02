import type { LangCode } from '@/types/meeting';

export const LANG_OPTIONS: LangCode[] = ['ko', 'en', 'ja', 'zh'];

export const LANG_LABEL: Record<LangCode, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
};

/** 언어별 표시 정보 (국기 이모지 + 라벨) */
export const LANGUAGES: { code: LangCode; flag: string; label: string }[] = [
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
];

export const LANG_EXAMPLE_TEXT: Record<LangCode, string> = {
  ko: '안녕하세요. 이것은 자막 미리보기입니다.',
  en: 'Hello. This is a caption preview.',
  ja: 'こんにちは。これはキャプションプレビューです。',
  zh: '你好。这是字幕预览。',
};

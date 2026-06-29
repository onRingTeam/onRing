import type { LangCode } from '@/types/meeting';

export const LANG_OPTIONS: LangCode[] = ['ko', 'en', 'ja', 'zh'];

export const LANG_LABEL: Record<LangCode, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
};

export const LANG_EXAMPLE_TEXT: Record<LangCode, string> = {
  ko: '안녕하세요. 이것은 자막 미리보기입니다.',
  en: 'Hello. This is a caption preview.',
  ja: 'こんにちは。これはキャプションプレビューです。',
  zh: '你好。这是字幕预览。',
};

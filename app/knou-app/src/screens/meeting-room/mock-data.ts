import type { CaptionItem, LangCode, Speaker } from '@/types/meeting';

/** 언어별 표시 정보 (국기 이모지 + 라벨) */
export const LANGUAGES: { code: LangCode; flag: string; label: string }[] = [
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
];

/** 화자별 아바타 이니셜/색상 (목업용) */
export const SPEAKER_STYLES: Record<string, { initial: string; color: string }> = {
  minjun: { initial: '김', color: '#1A3461' },
  smith: { initial: 'S', color: '#2D67C8' },
  tanaka: { initial: '田', color: '#3E5C8A' },
};

const SPEAKERS: Record<string, Speaker> = {
  minjun: { id: 'minjun', name: '김민준', language: 'ko' },
  smith: { id: 'smith', name: 'Smith, J.', language: 'en' },
  tanaka: { id: 'tanaka', name: '田中 遥', language: 'ja' },
};

export const MOCK_SPEAKERS: Speaker[] = Object.values(SPEAKERS);

/** 시연용 자막 스트림 (원문 + 내 언어 번역) */
export const MOCK_CAPTIONS: CaptionItem[] = [
  {
    id: 'c1',
    speaker: SPEAKERS.minjun,
    text: '좋습니다. 다음 마일스톤은 언제 예상하시나요?',
    translation: 'Great. When do you expect the next milestone?',
    timestamp: new Date('2026-07-01T14:04:00').getTime(),
  },
  {
    id: 'c2',
    speaker: SPEAKERS.tanaka,
    text: 'UIのデザインはほぼ完成しています。来週には全画面が揃います。',
    translation: 'UI 디자인은 거의 완성되었습니다. 다음 주면 모든 화면이 준비됩니다.',
    timestamp: new Date('2026-07-01T14:05:00').getTime(),
  },
  {
    id: 'c3',
    speaker: SPEAKERS.smith,
    text: 'We can do a full integration test by the 28th if the UI is ready.',
    translation: 'UI가 준비되면 28일까지 전체 통합 테스트를 진행할 수 있습니다.',
    timestamp: new Date('2026-07-01T14:06:00').getTime(),
  },
];

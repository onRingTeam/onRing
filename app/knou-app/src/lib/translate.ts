import { Platform } from 'react-native';
import TranslateText, { TranslateLanguage } from '@react-native-ml-kit/translate-text';

import type { LangCode } from '@/types/meeting';

/** LangCode → ML Kit 언어 코드 */
const LANG_TO_MLKIT: Record<LangCode, TranslateLanguage> = {
  ko: TranslateLanguage.KOREAN,
  en: TranslateLanguage.ENGLISH,
  ja: TranslateLanguage.JAPANESE,
  zh: TranslateLanguage.CHINESE,
};

/**
 * 문자 스크립트 기반 언어 감지 (지원 4개 언어 한정).
 * 한글 → ko, 가나 → ja, 한자만 → zh, 그 외 → en.
 * 가나 검사가 한자보다 먼저여야 함 (일본어 문장은 한자+가나 혼용).
 */
export function detectLang(text: string): LangCode {
  if (/[가-힣ᄀ-ᇿ]/.test(text)) return 'ko'; // 한글 음절·자모
  if (/[぀-ヿ]/.test(text)) return 'ja'; // 히라가나·가타카나
  if (/[一-鿿]/.test(text)) return 'zh'; // CJK 한자
  return 'en';
}


// TODO :: 외국어 번역 static 메소드
/**import { translate } from '@/lib/translate';
 * 기본: 문장 + 번역할 언어 (원본 언어는 자동 감지)
 * const ja = await translate('내일까지 자료 확인해주세요', 'ja');
 * 
 * 원본 언어를 알면 명시 (감지 생략, 더 정확)
 * const ko = await translate('Hello everyone', 'ko', 'en');
 * 
 */

/**
 * 온디바이스 번역 (Google ML Kit — 오프라인, 무과금). 어디서든 import 해서 사용.
 * 모델 미보유 시 자동 다운로드(언어당 ~30MB, 1회). 실패하면 null — 호출부는 원문 폴백.
 *
 * @param text 번역할 문장
 * @param targetLang 번역할 언어
 * @param sourceLang 원본 언어 (생략 시 문자 스크립트로 자동 감지)
 */
export async function translate(
  text: string,
  targetLang: LangCode,
  sourceLang?: LangCode,
): Promise<string | null> {
  const from = sourceLang ?? detectLang(text);
  if (from === targetLang || Platform.OS === 'web') return null;
  try {
    const result = await TranslateText.translate({
      text,
      sourceLanguage: LANG_TO_MLKIT[from],
      targetLanguage: LANG_TO_MLKIT[targetLang],
      downloadModelIfNeeded: true,
    });
    return String(result);
  } catch (e) {
    console.warn('[translate] 번역 실패', from, '→', targetLang, e);
    return null;
  }
}

let prefetched = false;

/**
 * 기본 4개 언어(ko·en·ja·zh) 모델 프리페치 — 앱 시작 시 1회 (네트워크 종류 무관).
 * "기본 내장" UX: 회의 진입 전에 모델을 미리 받아둬 첫 번역 지연을 없앤다.
 * (ML Kit 은 모델의 APK 번들을 지원하지 않아 최초 1회 런타임 다운로드가 최선)
 */
export async function prefetchTranslationModels(): Promise<void> {
  if (prefetched || Platform.OS === 'web') return;
  prefetched = true;

  for (const target of ['en', 'ja', 'zh'] as const) {
    try {
      // ko→X 더미 번역으로 양쪽 모델 다운로드 유도 (이미 있으면 즉시 통과)
      await TranslateText.translate({
        text: '.',
        sourceLanguage: TranslateLanguage.KOREAN,
        targetLanguage: LANG_TO_MLKIT[target],
        downloadModelIfNeeded: true,
      });
    } catch (e) {
      console.warn('[translate] 모델 프리페치 실패:', target, e);
    }
  }
}

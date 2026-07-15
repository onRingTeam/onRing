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

/**
 * 번역/모델 다운로드가 이 시간(ms)을 넘기면 실패로 간주하고 중단한다.
 * ML Kit 모델 다운로드가 멈추면(stall) 네이티브 Promise 가 영원히 resolve 되지 않아
 * 호출부가 무한 로딩에 갇히는 문제를 막기 위한 안전장치. 모델 최초 다운로드(수십 초)는
 * 통과시키되, 그보다 오래 걸리면 끊고 재시도(재번역)로 회복할 수 있게 한다.
 */
const TRANSLATE_TIMEOUT_MS = 60_000;

/**
 * 모델 최초 다운로드(프리페치)용 타임아웃 — 언어당 ~30MB라 대화형보다 넉넉히 잡는다.
 * 느린 네트워크에서 정상 다운로드가 60초를 넘겨 실패로 처리되는 걸 막기 위함.
 */
const MODEL_DOWNLOAD_TIMEOUT_MS = 120_000;

/** p 가 ms 안에 끝나지 않으면 reject. 성공 시 결과 그대로 통과. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('translate-timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
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
  return (await translateDetailed(text, targetLang, sourceLang)).text;
}

/**
 * translate() 의 상세판 — 실패 시 마지막 에러 메시지를 함께 돌려준다(폴백 판단/로깅용).
 *
 * @param timeoutMs 1회 시도 타임아웃. 전사 탭은 짧게 줘(모델 보유 시 즉시, 미보유 시 빠르게
 *   실패시켜 서버 번역으로 폴백) UX 를 살린다. 생략 시 라이브 회의용 기본값(60초).
 */
export async function translateDetailed(
  text: string,
  targetLang: LangCode,
  sourceLang?: LangCode,
  timeoutMs: number = TRANSLATE_TIMEOUT_MS,
): Promise<{ text: string | null; error: string | null }> {
  const from = sourceLang ?? detectLang(text);
  if (from === targetLang || Platform.OS === 'web') return { text: null, error: null };
  let lastError: string | null = null;
  // 최대 2회 시도 — ML Kit 최초 모델 다운로드가 transient 하게 실패하는 경우가 있어
  // 첫 실패 시 짧은 백오프 후 1회 재시도하면 회복되는 일이 많다(특히 ja·zh).
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await withTimeout(
        TranslateText.translate({
          text,
          sourceLanguage: LANG_TO_MLKIT[from],
          targetLanguage: LANG_TO_MLKIT[targetLang],
          downloadModelIfNeeded: true,
        }),
        timeoutMs,
      );
      return { text: String(result), error: null };
    } catch (e) {
      lastError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.warn(`[translate] 번역 실패 (${attempt}/2) ${from}→${targetLang}:`, e);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return { text: null, error: lastError };
}

let prefetched = false;

/** ko→target 더미 번역으로 해당 언어 모델을 확보. 성공 여부 반환(실패해도 throw 안 함). */
async function downloadModel(target: Exclude<LangCode, 'ko'>): Promise<boolean> {
  try {
    // 이미 있으면 즉시 통과, 없으면 다운로드 유도. 멈춘 다운로드로 프리페치가 영원히
    // pending 되지 않게 타임아웃을 건다(실패해도 false 반환 → 다음 실행에서 재시도).
    await withTimeout(
      TranslateText.translate({
        text: '.',
        sourceLanguage: TranslateLanguage.KOREAN,
        targetLanguage: LANG_TO_MLKIT[target],
        downloadModelIfNeeded: true,
      }),
      MODEL_DOWNLOAD_TIMEOUT_MS,
    );
    return true;
  } catch (e) {
    console.warn('[translate] 모델 프리페치 실패:', target, e);
    return false;
  }
}

/**
 * 기본 4개 언어(ko·en·ja·zh) 모델 프리페치 — 앱 시작 시 (네트워크 종류 무관).
 * "기본 내장" UX: 회의 진입 전에 모델을 미리 받아둬 첫 번역 지연을 없앤다.
 * (ML Kit 은 모델의 APK 번들을 지원하지 않아 최초 1회 런타임 다운로드가 최선)
 *
 * en·ja·zh 를 **한 번에 하나씩(순차)** 받는다. 병렬로 받으면 ML Kit 모델 동시 다운로드가
 * stall 되어 ja·zh 가 영영 안 받아지고(무한 로딩), 그 stuck 다운로드가 이후 on-demand
 * 번역까지 오염시키는 문제가 있었다. 순차 다운로드는 이 stall 을 피한다.
 * 하나가 실패해도 나머지는 계속 시도하고, 전부 성공해야 prefetched 를 세워 다음 실행에서
 * 재시도할 여지를 남긴다.
 */
export async function prefetchTranslationModels(): Promise<void> {
  if (prefetched || Platform.OS === 'web') return;

  let allOk = true;
  for (const target of ['en', 'ja', 'zh'] as const) {
    const ok = await downloadModel(target);
    if (!ok) allOk = false;
  }
  prefetched = allOk;
}

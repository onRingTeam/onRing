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
 * 원문 언어 결정 — 내용(문자 스크립트) 우선, 태그는 스크립트로 구분 불가한 경우만 보조.
 *
 * 메시지에 저장된 lang 태그는 발화자의 **설정 언어**라 실제 내용 언어와 다를 수 있다
 * (설정 ko 상태에서 영어를 입력하면 lang=ko 로 태깅됨). 잘못된 태그를 신뢰해 번역하면
 * ML Kit 이 엉뚱한 언어쌍으로 돌려 결과가 깨진다(예: 영어 문장을 ko→en 으로 번역하면
 * OOV passthrough 로 대소문자가 뒤섞임). 한글·가나·라틴은 스크립트가 언어를 확정하므로
 * 감지 결과를 쓰고, 한자만으로 쓰인 텍스트(ja/zh 구분 불가)만 태그로 보정한다.
 */
export function resolveSourceLang(text: string, taggedLang?: LangCode): LangCode {
  const detected = detectLang(text);
  if (detected === 'zh' && taggedLang === 'ja') return 'ja'; // 한자만 쓴 일본어 문장
  return detected;
}

/**
 * 온디바이스 번역(모델 보유 시) 1회 타임아웃. 모델이 있으면 번역은 1초 안쪽이라
 * 이 값은 순수 안전장치 — 네이티브 Promise 가 영원히 resolve 안 되는 경우를 끊는다.
 */
const TRANSLATE_TIMEOUT_MS = 30_000;

/**
 * 모델 다운로드(언어당 ~30MB) 1회 타임아웃. 이 시간을 넘기면 stall 로 간주하고 끊어
 * 다음 요청에서 재시도할 수 있게 한다(멈춘 다운로드에 영원히 매달리지 않기).
 */
const MODEL_DOWNLOAD_TIMEOUT_MS = 60_000;

/** 모델 다운로드 transient 실패(특히 ja·zh) 시 재시도 전 대기. */
const DOWNLOAD_RETRY_BACKOFF_MS = 750;

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

/**
 * 모델 보유가 확인된 언어. `downloadModelIfNeeded: false` 번역이 성공하면 해당 언어쌍의
 * 두 모델이 모두 기기에 있다는 뜻이므로 여기 기록한다(이후 중복 다운로드 요청 생략).
 */
const modelReady = new Set<LangCode>();

/**
 * 모델 다운로드 직렬화 큐. ML Kit 은 모델을 **동시에** 여러 개 다운로드하면 stall 되어
 * (다운로드가 영영 안 끝나고 이후 시도까지 오염) 모델이 사실상 안 받아지는 문제가 있다.
 * 프리페치든 온디맨드(번역 버튼)든 모든 다운로드를 이 체인 하나로 줄 세워 stall 을 원천 차단한다.
 */
let downloadQueue: Promise<unknown> = Promise.resolve();

/** 언어쌍별 진행 중 다운로드 — 같은 쌍의 중복 요청은 기존 Promise 를 공유한다. */
const downloadInflight = new Map<string, Promise<boolean>>();

/**
 * from·to 언어 모델을 확보한다(없으면 다운로드). 전역 큐로 직렬화되며, 성공 여부를 반환하고
 * 절대 throw 하지 않는다. 실패한 쌍은 inflight 에서 제거되어 다음 요청 때 자연 재시도된다.
 */
function ensureModels(from: LangCode, to: LangCode): Promise<boolean> {
  if (modelReady.has(from) && modelReady.has(to)) return Promise.resolve(true);
  const key = `${from}->${to}`;
  const existing = downloadInflight.get(key);
  if (existing) return existing;

  const job = downloadQueue.then(async () => {
    if (modelReady.has(from) && modelReady.has(to)) return true;
    // 최대 2회 시도 — 최초 다운로드가 transient 하게 실패하는 경우 짧은 백오프 후 1회 재시도.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await withTimeout(
          TranslateText.translate({
            text: '.',
            sourceLanguage: LANG_TO_MLKIT[from],
            targetLanguage: LANG_TO_MLKIT[to],
            downloadModelIfNeeded: true,
          }),
          MODEL_DOWNLOAD_TIMEOUT_MS,
        );
        modelReady.add(from);
        modelReady.add(to);
        return true;
      } catch (e) {
        console.warn(`[translate] 모델 다운로드 실패 (${attempt}/2) ${key}:`, e);
        if (attempt < 2) await new Promise((r) => setTimeout(r, DOWNLOAD_RETRY_BACKOFF_MS));
      }
    }
    return false;
  });
  downloadQueue = job; // job 은 내부에서 catch 하므로 reject 하지 않는다
  downloadInflight.set(key, job);
  void job.finally(() => downloadInflight.delete(key));
  return job;
}

/** 모델 보유 시에만 성공하는 온디바이스 번역 시도(다운로드 유발 없음 — 미보유면 즉시 실패). */
async function translateOnDevice(
  text: string,
  from: LangCode,
  to: LangCode,
  timeoutMs: number,
): Promise<string> {
  const result = await withTimeout(
    TranslateText.translate({
      text,
      sourceLanguage: LANG_TO_MLKIT[from],
      targetLanguage: LANG_TO_MLKIT[to],
      downloadModelIfNeeded: false,
    }),
    timeoutMs,
  );
  // 성공 = 두 언어 모델 모두 보유 확인
  modelReady.add(from);
  modelReady.add(to);
  return String(result);
}

/**
 * ML Kit 이 번역하지 못하고 원문을 사실상 그대로 돌려준(passthrough) 결과인지 판정.
 * 짧은 감탄사·구어(예: "되라", "얍")는 ML Kit 이 번역 없이 원문을 반환하는데, 이를
 * 성공으로 노출하면 원문이 "번역 결과"로 보인다 → 실패로 처리해 서버 번역으로 폴백시킨다.
 */
function looksUntranslated(text: string, result: string, from: LangCode, to: LangCode): boolean {
  if (result.trim() === text.trim()) return true;
  // 결과가 여전히 원문 언어 스크립트면 미번역. 단 ja↔zh 는 한자만으로도 정상 번역이
  // 가능해 스크립트로 판정할 수 없으므로 제외.
  if ((from === 'ja' && to === 'zh') || (from === 'zh' && to === 'ja')) return false;
  return detectLang(result) === from;
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
 * 동작: 먼저 다운로드 없이(downloadModelIfNeeded:false) 번역을 시도한다 — 모델이 있으면
 * 즉시 성공(1초 안쪽), 없으면 즉시 실패하므로 "모델 보유 여부 판별"을 겸한다.
 * 미보유 시 다운로드를 전역 직렬 큐에 등록하고,
 *  - waitForModel=true(기본, 라이브 회의): 다운로드 완료를 기다렸다가 번역해 반환.
 *  - waitForModel=false(전사 탭): 즉시 실패를 반환해 호출부가 서버 번역으로 바로 폴백하게
 *    한다(수 초 대기 제거). 다운로드는 백그라운드에서 계속되어 다음 번역부턴 온디바이스.
 *
 * @param timeoutMs 모델 보유 시 번역 1회 타임아웃. 생략 시 기본 30초(안전장치).
 * @param waitForModel 모델 미보유 시 다운로드 완료를 기다릴지 여부.
 */
export async function translateDetailed(
  text: string,
  targetLang: LangCode,
  sourceLang?: LangCode,
  timeoutMs: number = TRANSLATE_TIMEOUT_MS,
  waitForModel: boolean = true,
): Promise<{ text: string | null; error: string | null }> {
  const from = sourceLang ?? detectLang(text);
  if (from === targetLang || Platform.OS === 'web') return { text: null, error: null };

  // 1) 다운로드 없이 시도 — 모델이 있으면 여기서 끝(즉시), 없으면 즉시 실패로 넘어감.
  let lastError: string | null = null;
  try {
    const result = await translateOnDevice(text, from, targetLang, timeoutMs);
    // 모델은 있지만 번역이 안 된(passthrough) 경우 — 다운로드로 해결될 문제가 아니므로
    // 바로 실패를 돌려 호출부가 서버 번역으로 폴백하게 한다.
    if (looksUntranslated(text, result, from, targetLang)) return { text: null, error: 'untranslated' };
    return { text: result, error: null };
  } catch (e) {
    lastError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  // 2) 모델 미보유(또는 stall) → 다운로드를 큐에 등록.
  const download = ensureModels(from, targetLang);

  // 전사 탭: 기다리지 않고 즉시 실패 반환 → 호출부가 서버 번역으로 폴백. 다운로드는 백그라운드 진행.
  if (!waitForModel) return { text: null, error: lastError };

  // 라이브 회의: 서버 폴백이 없으므로 다운로드 완료를 기다렸다가 번역.
  if (await download) {
    try {
      const result = await translateOnDevice(text, from, targetLang, timeoutMs);
      if (looksUntranslated(text, result, from, targetLang)) return { text: null, error: 'untranslated' };
      return { text: result, error: null };
    } catch (e) {
      lastError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.warn(`[translate] 번역 실패 ${from}→${targetLang}:`, e);
    }
  }
  return { text: null, error: lastError };
}

/**
 * 기본 4개 언어(ko·en·ja·zh) 모델 프리페치 — 앱 시작 시 (네트워크 종류 무관).
 * "기본 내장" UX: 회의 진입 전에 모델을 미리 받아둬 첫 번역 지연을 없앤다.
 * (ML Kit 은 모델의 APK 번들을 지원하지 않아 최초 1회 런타임 다운로드가 최선)
 *
 * 모든 다운로드는 ensureModels 의 전역 직렬 큐를 타므로 온디맨드 번역과 겹쳐도 동시
 * 다운로드 stall 이 없다. 실패한 언어는 이후 번역 요청이 필요할 때 자연 재시도된다
 * (앱 재시작 불필요).
 */
export async function prefetchTranslationModels(): Promise<void> {
  if (Platform.OS === 'web') return;
  for (const target of ['en', 'ja', 'zh'] as const) {
    await ensureModels('ko', target);
  }
}

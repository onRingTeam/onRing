import * as Speech from 'expo-speech';

import type { BackendLang } from '@/types/meeting';

/** 발화 언어 → TTS 로케일(BCP-47). 미지정 시 한국어. */
const LANG_TO_LOCALE: Record<BackendLang, string> = {
  KO: 'ko-KR',
  EN: 'en-US',
  JA: 'ja-JP',
  ZH: 'zh-CN',
};

/**
 * 수신 채팅 TTS 읽어주기 (설계 §3: 수신 텍스트 → 로컬 TTS).
 * 연속 수신 시 겹치지 않도록 큐잉은 OS TTS 엔진에 맡긴다 (expo-speech 는 기본 큐잉).
 */
export function speakMessage(text: string, lang?: BackendLang | null): void {
  if (__DEV__) console.log('[tts] speak:', text);
  Speech.speak(text, {
    language: LANG_TO_LOCALE[lang ?? 'KO'],
    rate: 1.0,
  });
}

/** 재생 중/대기 중 TTS 전부 중단 (회의 퇴장 시 등). */
export function stopSpeaking(): void {
  void Speech.stop();
}

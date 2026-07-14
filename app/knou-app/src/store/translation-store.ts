import { create } from 'zustand';

import type { LangCode } from '@/types/meeting';

/**
 * 온디바이스 번역 모델(ML Kit) 다운로드 상태.
 *
 * ML Kit 모델은 APK 번들이 불가해 최초 1회 런타임 다운로드(언어당 ~30MB)가 필요하고,
 * 네트워크에 따라 수십 초 걸릴 수 있다. 그동안 번역이 비어 보여 "고장 난 것"으로 오해하기 쉬우므로,
 * 다운로드 진행 상태를 노출해 "고장이 아니라 받는 중"임을 사용자에게 알린다. (translate.ts 가 갱신)
 */
interface TranslationModelState {
  /** 현재 다운로드가 진행 중인 언어들. 비어 있지 않으면 '다운로드 중' 배너를 노출한다. */
  downloading: LangCode[];
  /** 기본 4개 언어 프리페치가 성공적으로 끝났는지. */
  ready: boolean;

  /** 특정 언어 모델 다운로드 시작을 표시. */
  startDownload: (lang: LangCode) => void;
  /** 특정 언어 모델 다운로드 종료를 표시(성공/실패 무관하게 목록에서 제거). */
  finishDownload: (lang: LangCode) => void;
  /** 기본 모델 프리페치 완료 여부 설정. */
  setReady: (ready: boolean) => void;
}

export const useTranslationModelStore = create<TranslationModelState>((set) => ({
  downloading: [],
  ready: false,

  startDownload: (lang) =>
    set((s) => ({
      downloading: s.downloading.includes(lang) ? s.downloading : [...s.downloading, lang],
    })),
  finishDownload: (lang) =>
    set((s) => ({ downloading: s.downloading.filter((l) => l !== lang) })),
  setReady: (ready) => set({ ready }),
}));

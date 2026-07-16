import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import type { LangCode } from '@/types/meeting';

/** LangCode → 음성인식 로케일(BCP-47) */
const LANG_TO_LOCALE: Record<LangCode, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  zh: 'zh-CN',
};

export interface LiveSttOptions {
  /** 발화(인식) 언어 */
  lang: LangCode;
  /** 문장 확정 시 호출 — 자막/채팅으로 전송할 텍스트 */
  onFinal: (text: string) => void;
  /** 인식 중간 결과 (선택 — 내 화면 미리보기용) */
  onPartial?: (text: string) => void;
}

/**
 * 내 마이크 발화의 라이브 STT 세션 (온디바이스 음성인식).
 *
 * 설계(docs/음성통화-접근성-회의-설계.md): 각자 "자기 마이크"만 STT 하고,
 * 확정 텍스트는 기존 STOMP 채팅 채널로 전송한다. WebRTC 음성과는 완전히 분리.
 *
 * OS 인식기는 침묵이 이어지면 세션을 스스로 끝내므로,
 * stop() 전까지는 end 이벤트마다 자동으로 재시작해 연속 인식을 유지한다.
 */
export class LiveStt {
  private active = false;
  private subscriptions: { remove: () => void }[] = [];

  constructor(private readonly options: LiveSttOptions) {}

  /** 인식 시작 (마이크·음성인식 권한 필요 — 미허용 시 요청) */
  async start(): Promise<boolean> {
    if (this.active) return true;

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      console.warn('[stt] 음성 인식 권한 거부됨');
      return false;
    }

    this.active = true;
    this.subscriptions = [
      ExpoSpeechRecognitionModule.addListener('result', (event) => {
        const text = event.results?.[0]?.transcript?.trim();
        if (!text) return;
        if (event.isFinal) this.options.onFinal(text);
        else this.options.onPartial?.(text);
      }),
      ExpoSpeechRecognitionModule.addListener('error', (event) => {
        // no-speech(침묵)는 정상 흐름 — end 에서 재시작됨
        if (event.error !== 'no-speech') console.warn('[stt] 인식 오류', event.error, event.message);
      }),
      ExpoSpeechRecognitionModule.addListener('end', () => {
        // 침묵 등으로 세션이 끝나면 재시작해 연속 인식 유지
        if (this.active) this.begin();
      }),
    ];
    this.begin();
    return true;
  }

  /** 인식 종료 */
  stop(): void {
    this.active = false;
    this.subscriptions.forEach((s) => s.remove());
    this.subscriptions = [];
    ExpoSpeechRecognitionModule.abort();
  }

  private begin(): void {
    try {
      ExpoSpeechRecognitionModule.start({
        lang: LANG_TO_LOCALE[this.options.lang],
        interimResults: true,
        continuous: true,
        // iOS: WebRTC 통화 오디오 세션과 공존 (재생 유지 + 믹스)
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth', 'mixWithOthers'],
          mode: 'measurement',
        },
      });
    } catch (e) {
      console.warn('[stt] start 실패', e);
      this.active = false;
    }
  }
}

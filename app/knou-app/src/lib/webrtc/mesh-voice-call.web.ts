import type { SignalMessage } from '@/types/meeting';

export interface MeshVoiceCallOptions {
  /** 이 세션의 고유 peerId */
  peerId: string;
  /** STOMP 시그널 발행 콜백 */
  sendSignal: (msg: SignalMessage) => void;
}

/**
 * 웹 전용 스텁.
 *
 * WebRTC 음성통화는 `react-native-webrtc`/`react-native-incall-manager`(네이티브 전용,
 * `requireNativeComponent` 사용)에 의존하므로 웹 번들에서는 로드 자체가 불가능하다.
 * Metro 가 웹 빌드에서 `mesh-voice-call.ts` 대신 이 파일(`.web.ts`)을 선택해
 * 앱이 크래시 없이 뜨게 한다. 음성통화 관련 동작은 모두 no-op.
 * (자막/채팅 STOMP·STT 등 나머지 회의 기능은 웹에서도 정상 동작)
 */
export class MeshVoiceCall {
  private warned = false;

  constructor(_options: MeshVoiceCallOptions) {}

  private warn(): void {
    if (this.warned) return;
    this.warned = true;
    console.warn('[voice] 웹에서는 WebRTC 음성통화가 지원되지 않습니다. (no-op)');
  }

  async start(): Promise<void> {
    this.warn();
  }

  async handleSignal(_msg: SignalMessage): Promise<void> {}

  setMicEnabled(_enabled: boolean): void {}

  setSpeakerEnabled(_enabled: boolean): void {}

  stop(): void {}
}

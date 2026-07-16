import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

import type { SignalMessage } from '@/types/meeting';
import { ICE_SERVERS } from './ice-config';

export interface MeshVoiceCallOptions {
  /** 이 세션의 고유 peerId */
  peerId: string;
  /** STOMP 시그널 발행 콜백 */
  sendSignal: (msg: SignalMessage) => void;
}

/**
 * WebRTC Mesh 음성통화 (오디오 전용, 최대 6인).
 *
 * 부트스트랩:
 * 1. start() → 로컬 마이크 확보 후 'join' 브로드캐스트.
 * 2. 상대의 'join'을 받으면 서로를 인지(브로드캐스트면 join으로 회신).
 * 3. peerId가 큰 쪽이 offer 발신(glare 방지) → 상대가 answer.
 * 4. ICE candidate는 trickle 로 교환.
 * 5. 오디오는 수신 시 자동 재생(RTCView 불필요).
 */
export class MeshVoiceCall {
  private readonly peerId: string;
  private readonly sendSignal: (msg: SignalMessage) => void;
  private localStream: MediaStream | null = null;
  private readonly peers = new Map<string, RTCPeerConnection>();

  constructor(options: MeshVoiceCallOptions) {
    this.peerId = options.peerId;
    this.sendSignal = options.sendSignal;
  }

  /** 로컬 마이크 확보 후 방에 입장 공지. (호출 전 RECORD_AUDIO 권한 필요) */
  async start(): Promise<void> {
    this.localStream = (await mediaDevices.getUserMedia({ audio: true, video: false })) as MediaStream;
    // 통화용 오디오 세션 시작: 회의 앱이므로 스피커폰 기본 (이어폰/블루투스 연결 시 자동 우선)
    InCallManager.start({ media: 'audio' });
    InCallManager.setForceSpeakerphoneOn(true);
    this.sendSignal({ type: 'join', from: this.peerId, to: null });
  }

  /** 수신한 시그널 처리 (STOMP onSignal → 여기로 전달) */
  async handleSignal(msg: SignalMessage): Promise<void> {
    if (msg.from === this.peerId) return; // 내가 보낸 것 무시
    if (msg.to && msg.to !== this.peerId) return; // 나 대상 아님

    switch (msg.type) {
      case 'join': {
        // 브로드캐스트면 나를 알리려 회신(1:1은 회신 안 함 → 루프 방지)
        if (!msg.to) this.sendSignal({ type: 'join', from: this.peerId, to: msg.from });
        // peerId 큰 쪽이 offer (양측 동일 판정 → 정확히 한 명만 발신)
        if (this.peerId > msg.from) await this.makeOffer(msg.from);
        break;
      }
      case 'offer': {
        const pc = this.ensurePeer(msg.from);
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(msg.payload!)));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal({ type: 'answer', from: this.peerId, to: msg.from, payload: JSON.stringify(answer) });
        break;
      }
      case 'answer': {
        await this.peers.get(msg.from)?.setRemoteDescription(new RTCSessionDescription(JSON.parse(msg.payload!)));
        break;
      }
      case 'candidate': {
        if (msg.payload) {
          await this.peers.get(msg.from)?.addIceCandidate(new RTCIceCandidate(JSON.parse(msg.payload)));
        }
        break;
      }
      case 'leave': {
        this.closePeer(msg.from);
        break;
      }
    }
  }

  /** 마이크 on/off (트랙 enable 토글 — 연결은 유지) */
  setMicEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  /** 스피커폰 on/off (off = 수화부/이어폰) */
  setSpeakerEnabled(enabled: boolean): void {
    InCallManager.setForceSpeakerphoneOn(enabled);
  }

  /** 방 퇴장: leave 공지 후 모든 피어/스트림 정리 */
  stop(): void {
    this.sendSignal({ type: 'leave', from: this.peerId, to: null });
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    InCallManager.stop();
  }

  private async makeOffer(remoteId: string): Promise<void> {
    const pc = this.ensurePeer(remoteId);
    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);
    this.sendSignal({ type: 'offer', from: this.peerId, to: remoteId, payload: JSON.stringify(offer) });
  }

  private ensurePeer(remoteId: string): RTCPeerConnection {
    const existing = this.peers.get(remoteId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // @ts-expect-error react-native-webrtc 이벤트 타입
    pc.addEventListener('connectionstatechange', () => {
      console.log(`[voice] peer ${remoteId} 상태: ${pc.connectionState}`);
    });

    // 로컬 마이크 트랙 송신
    this.localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!);
    });

    // ICE candidate trickle
    // @ts-expect-error react-native-webrtc 이벤트 타입
    pc.addEventListener('icecandidate', (event) => {
      const c = event.candidate;
      if (c) {
        this.sendSignal({
          type: 'candidate',
          from: this.peerId,
          to: remoteId,
          payload: JSON.stringify({
            candidate: c.candidate,
            sdpMid: c.sdpMid,
            sdpMLineIndex: c.sdpMLineIndex,
          }),
        });
      }
    });

    this.peers.set(remoteId, pc);
    return pc;
  }

  private closePeer(remoteId: string): void {
    this.peers.get(remoteId)?.close();
    this.peers.delete(remoteId);
  }
}

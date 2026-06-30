/****
 * Speak to Text 
 * 생성방법 : const stt = SttFactory.create();
 */
export type SttAudioInput = Blob | File | MediaStream;

export abstract class Stt {
  abstract convertText(audio: SttAudioInput): Promise<string>;
}

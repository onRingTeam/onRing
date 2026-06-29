import { DeviceUtil } from "@/utils/device-util";
import { Platform } from "react-native";
import { SttServer } from "./stt/stt.server";
import { SttAndroid } from "./stt/stt.android";
import { SttIOS } from "./stt/stt.ios";

export class SttFactory {
  static create(): Stt {
    if (!DeviceUtil.isOnDevice()) {
      // 저사양기기 서버 fallback
      return new SttServer();
    } else if (Platform.OS === 'android'){
      // 안드로이드
      return new SttAndroid();
    } else {
      // iOS
      return new SttIOS();
    }
  }
}


/**
 * Speak to Text 
 */
export abstract class Stt {
 
}
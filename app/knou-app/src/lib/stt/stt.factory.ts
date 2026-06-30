import { DeviceUtil } from "@/utils/device-util";
import { Stt } from "../stt";
import { SttServer } from "./stt.server";
import { SttAndroid } from "./stt.android";
import { SttIOS } from "./stt.ios";
import { Platform } from "react-native";

export class SttFactory {
  static create(): Stt {
    if (Platform.OS === 'android'){
      // 안드로이드
      return new SttAndroid();
    } else if (Platform.OS === 'ios') {
      // iOS
      return new SttIOS();
    } else {
      // 저사양기기 서버 fallback && OS 식별 불가시 fallback
      return new SttServer();
    }
  }  
}

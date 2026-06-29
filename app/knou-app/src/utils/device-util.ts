import * as Device from 'expo-device';

/** 디바이스 등급. HIGH=온디바이스 STT/TTS, LOW=서버 폴백. */
export type DeviceGrade = 'HIGH' | 'LOW';

export interface DeviceInfo {
  /** OS 이름 */
  osName: string | null;
  /** OS 버전 */
  osVersion: string | null;
  /** 기기 모델 이름 */
  modelName: string | null;
  /** 총 RAM (bytes). 알 수 없으면 null. */
  totalMemoryBytes: number | null;
  /** 기기 성능 연식 (expo-device). 알 수 없으면 null. */
  deviceYearClass: number | null;
  /** 실기기 여부 (false면 시뮬레이터/에뮬레이터). */
  isPhysicalDevice: boolean;
}

const GB = 1024 ** 3;

// 온디바이스 처리(HIGH) 기준 — 추후 실측으로 조정
const MIN_RAM_GB_FOR_HIGH = 4;        // RAM 4GB 이상
const MIN_YEAR_CLASS_FOR_HIGH = 2018; // 기기 연식 2018 이상

// 디바이스 정보는 앱 실행 중 변하지 않으므로 최초 1회만 읽어 캐시
let cachedInfo: DeviceInfo | null = null;

export class DeviceUtil {
  /** 디바이스 정보 (expo-device 상수 기반, 1회 캐시). */
  static getDeviceInfo(): DeviceInfo {
    if (cachedInfo) return cachedInfo;
    cachedInfo = {
      osName: Device.osName ?? null,
      osVersion: Device.osVersion ?? null,
      modelName: Device.modelName ?? null,
      totalMemoryBytes: Device.totalMemory ?? null,
      deviceYearClass: Device.deviceYearClass ?? null,
      isPhysicalDevice: Device.isDevice,
    };
    return cachedInfo;
  }

  /** RAM(GB) 환산값. 알 수 없으면 null. */
  static getTotalMemoryGb(): number | null {
    const bytes = DeviceUtil.getDeviceInfo().totalMemoryBytes;
    return bytes != null ? Math.round((bytes / GB) * 10) / 10 : null;
  }

  /**
   * 디바이스 등급.
   * RAM 또는 기기 연식이 기준 이상이면 HIGH, 둘 다 알 수 없거나 미달이면 LOW(서버 폴백).
   */
  static getDeviceGrade(): DeviceGrade {
    const { totalMemoryBytes, deviceYearClass } = DeviceUtil.getDeviceInfo();
    const ramOk = totalMemoryBytes != null && totalMemoryBytes >= MIN_RAM_GB_FOR_HIGH * GB;
    const yearOk = deviceYearClass != null && deviceYearClass >= MIN_YEAR_CLASS_FOR_HIGH;
    return ramOk || yearOk ? 'HIGH' : 'LOW';
  }

  /** 온디바이스 STT/TTS 가능 여부 (lib/speech 분기용). */
  static isOnDevice(): boolean {
    return DeviceUtil.getDeviceGrade() === 'HIGH';
  }
}

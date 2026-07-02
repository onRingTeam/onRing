#!/usr/bin/env bash
# 에뮬레이터를 부팅한 뒤 앱을 빌드/설치/실행합니다.
# 사용법: npm run emu   (첫 AVD 사용)
#        npm run emu -- <AVD_NAME>
set -euo pipefail

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"
EMULATOR="$ANDROID_HOME/emulator/emulator"

# 이미 연결된 기기가 있으면 그대로 사용
if [ -z "$("$ADB" devices | grep -w "device" || true)" ]; then
  AVD="${1:-$("$EMULATOR" -list-avds | head -1)}"
  if [ -z "$AVD" ]; then
    echo "사용 가능한 AVD가 없습니다. Android Studio에서 에뮬레이터를 먼저 생성하세요." >&2
    exit 1
  fi
  echo "▶ 에뮬레이터 부팅: $AVD"
  "$EMULATOR" -avd "$AVD" >/dev/null 2>&1 &
  echo "▶ 부팅 대기 중..."
  "$ADB" wait-for-device
  until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
    sleep 2
  done
  echo "✔ 에뮬레이터 준비 완료"
else
  echo "✔ 이미 연결된 기기 사용"
fi

echo "▶ 빌드 및 실행"
exec npx expo run:android

// 정적 app.json → 동적 config 로 전환 (2026-07-16).
// main(production) 과 dev/preview 빌드를 완전히 별개 앱(다른 package/bundle id·앱 이름)으로
// 설치할 수 있게 하려면, 빌드 시점에 값을 바꿔줄 방법이 필요하다 — app.json(정적)으로는 불가능.
//
// EAS 는 eas.json 각 build 프로필의 "env" 에 넣은 값을 config 평가 시점에 process.env 로 주입한다.
// 그래서 여기서 APP_VARIANT 를 읽어 이름·패키지명·번들ID만 분기한다.
//
// ⚠️ scheme("knouapp")은 절대 변형하지 않는다 — OAuth 로그인(src/lib/auth.ts)과 회의 종료 딥링크
//   (src/screens/meeting-room/meeting-web-screen.tsx) 가 'knouapp' 을 하드코딩해서 redirect URI 를
//   만든다. scheme 을 변형하면 그쪽 코드도 같이 고쳐야 하는데, 지금은 두 앱을 나란히 설치해도 되게
//   package/이름만 바꾸는 게 목적이라 건드리지 않는다 (동시 설치 시 두 앱이 같은 scheme 을 등록하는
//   점은 알려진 한계 — 딥링크가 필요하면 그때 auth.ts·meeting-web-screen.tsx 도 함께 바꿀 것).

/** eas.json 이 build 프로필별로 주입. 로컬(expo start/run) 처럼 미지정이면 dev 로 취급해
 *  이미 설치된 production/preview 앱을 실수로 덮어쓰지 않게 한다. */
const APP_VARIANT = process.env.APP_VARIANT ?? 'development';
const IS_PRODUCTION = APP_VARIANT === 'production';

const IDENTITY = IS_PRODUCTION
  ? { name: 'onRing', androidPackage: 'com.anonymous.knouapp', iosBundleId: 'com.anonymous.knouapp' }
  : { name: 'onRing Dev', androidPackage: 'com.anonymous.knouapp.dev', iosBundleId: 'com.anonymous.knouapp.dev' };

module.exports = {
  expo: {
    name: IDENTITY.name,
    slug: 'knou-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'knouapp',
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/images/icon.png',
      bitcode: false,
      bundleIdentifier: IDENTITY.iosBundleId,
      infoPlist: {
        NSSpeechRecognitionUsageDescription: '발화를 자막으로 변환하기 위해 음성 인식 권한이 필요합니다.',
        NSMicrophoneUsageDescription: '회의 중 음성 대화를 위해 마이크 접근이 필요합니다.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#FFFFFF',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: IDENTITY.androidPackage,
      permissions: [
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.CAMERA',
        'android.permission.INTERNET',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.RECORD_AUDIO',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.WAKE_LOCK',
        'android.permission.BLUETOOTH',
      ],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#FFFFFF',
          image: './assets/images/splash-icon.png',
          imageWidth: 120,
          android: {
            image: './assets/images/splash-icon.png',
            imageWidth: 120,
          },
        },
      ],
      [
        '@config-plugins/react-native-webrtc',
        {
          microphonePermission: '회의 중 음성 대화를 위해 마이크 접근이 필요합니다.',
          cameraPermission: '화상 회의 기능을 위해 카메라 접근이 필요합니다.',
        },
      ],
      [
        'expo-speech-recognition',
        {
          microphonePermission: '회의 중 음성 대화를 위해 마이크 접근이 필요합니다.',
          speechRecognitionPermission: '발화를 자막으로 변환하기 위해 음성 인식 권한이 필요합니다.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '071e6c68-3bca-4e65-944e-0fda3486a813',
      },
    },
    owner: 'onring',
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/071e6c68-3bca-4e65-944e-0fda3486a813',
    },
  },
};

/**
 * Supabase 클라이언트. 구글 등 소셜 로그인(OAuth)의 "인증 창구"로만 사용한다.
 * 실제 도메인 데이터는 백엔드(MySQL)에 저장하며, 여기서 얻은 신원(email)을
 * 백엔드 /auth/login 으로 넘겨 백엔드 userId/JWT 로 교환한다.  → [auth.ts]
 *
 * Publishable(anon) key 만 사용한다. service_role 키는 클라이언트에 절대 넣지 않는다.
 * realtime 은 사용하지 않는다(auth 전용).
 */
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] EXPO_PUBLIC_SUPABASE_URL / ANON_KEY 가 비어있음. .env.local 확인.');
}

const isWeb = Platform.OS === 'web';
const hasWindow = typeof window !== 'undefined';

/** 웹 SSR(Node, window 없음)에서 localStorage 접근이 터지지 않도록 하는 메모리 폴백. */
const memoryStorage = (() => {
  const m = new Map<string, string>();
  return {
    getItem: async (k: string) => m.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: async (k: string) => {
      m.delete(k);
    },
  };
})();

// 네이티브: AsyncStorage / 웹 브라우저: supabase 기본(localStorage) / 웹 SSR: 메모리.
const storage = isWeb ? (hasWindow ? undefined : memoryStorage) : AsyncStorage;

// realtime 미사용. Node(웹 SSR)엔 WebSocket 이 없어 createClient 가 예외를 던지므로,
// WebSocket 이 없을 때만 no-op transport 를 넘겨 초기화 예외만 막는다. (실제 연결은 안 함)
const hasWebSocket = typeof globalThis !== 'undefined' && 'WebSocket' in (globalThis as object);
const realtime = hasWebSocket ? undefined : { transport: class {} as never };

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage,
    // 웹 SSR 에선 자동 갱신 타이머가 localStorage 를 건드려 터지므로 끈다.
    autoRefreshToken: !isWeb || hasWindow,
    persistSession: true,
    // RN 에는 URL 세션 감지가 없으므로 끈다. 콜백은 auth.ts 에서 수동 처리.
    detectSessionInUrl: false,
    // 모바일 권장 흐름. 콜백으로 code 를 받아 exchangeCodeForSession 로 교환.
    flowType: 'pkce',
  },
  realtime,
});

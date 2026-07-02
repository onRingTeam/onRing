/**
 * 구글 로그인(Supabase OAuth) + 백엔드 토큰 교환.
 *
 * 흐름:
 *  1) supabase.auth.signInWithOAuth('google') → 인증 URL 획득
 *  2) expo-web-browser 로 브라우저 열어 구글 로그인 → knouapp:// 딥링크로 복귀
 *  3) 콜백 URL 의 code 를 exchangeCodeForSession 으로 세션 교환 (Supabase 신원 확보)
 *  4) Supabase access_token 을 백엔드 /auth/login 에 넘겨 → 백엔드 userId + JWT 교환
 *
 * 왜 4단계가 필요? dev/운영 백엔드는 자체 userId(Long) 기반이라, 서버가 사용자를
 * 구별하려면 Supabase email → 백엔드 userId 매핑이 있어야 한다.  → [config.ts]
 */
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { supabase } from './supabase';
import { API_BASE } from './config';
import { useAuthStore } from '@/store';
import type { UserProfile } from '@/types/settings';
import type { Session } from '@supabase/supabase-js';

// 브라우저 인증 세션 마무리(재진입 대비).
WebBrowser.maybeCompleteAuthSession();

/** OAuth 복귀용 딥링크. Expo Go 는 exp://, dev build 는 knouapp:// 로 자동 판별. */
const redirectTo = makeRedirectUri({ scheme: 'knouapp', path: 'auth/callback' });

// 이 값을 Supabase 대시보드 → Authentication → URL Configuration → Redirect URLs 에 등록해야 함.
if (__DEV__) console.log('[auth] OAuth redirectTo =', redirectTo);

/** 백엔드 토큰 교환 결과. */
export interface BackendAuth {
  userId: number;
  token: string; // 백엔드 JWT (운영 인증용)
  email: string;
  name: string;
}

/** 콜백 URL 에서 세션을 만든다 (PKCE: code / 암시적: access_token). */
async function createSessionFromUrl(url: string): Promise<Session | null> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(`OAuth 오류: ${errorCode}`);

  const { code, access_token, refresh_token } = params;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }
  if (access_token) {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return data.session;
  }
  return null;
}

/**
 * 구글 로그인 실행. 성공 시 Supabase 세션을 반환한다(취소 시 null).
 * 백엔드 교환은 세션 확보 후 [exchangeWithBackend] 로 이어서 한다.
 */
export async function signInWithGoogle(): Promise<Session | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('인증 URL 을 받지 못했습니다.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null; // 사용자 취소/닫기

  return createSessionFromUrl(result.url);
}

/**
 * Supabase access_token 을 백엔드에 넘겨 userId/JWT 로 교환한다.
 * 백엔드: POST /auth/login  { accessToken } → { userId, token, email, name }
 */
export async function exchangeWithBackend(supabaseAccessToken: string): Promise<BackendAuth> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: supabaseAccessToken }),
  });
  if (!res.ok) throw new Error(`백엔드 로그인 실패 (${res.status})`);
  return res.json();
}

/** Supabase 세션 + 백엔드 응답 → 앱 UserProfile 로 매핑. */
function toUserProfile(session: Session, backend: BackendAuth): UserProfile {
  const meta = (session.user.user_metadata ?? {}) as Record<string, string>;
  return {
    id: session.user.id, // Supabase UUID (표시/식별용)
    name: backend.name || meta.full_name || meta.name || session.user.email?.split('@')[0] || '사용자',
    email: backend.email || session.user.email || '',
    avatarUrl: meta.avatar_url || meta.picture,
    plan: 'free',
    remainingMeetings: 0,
  };
}

/** 세션 확보 후: 백엔드 교환 → 스토어 반영. (로그인/세션복구 공통) */
export async function completeLogin(session: Session): Promise<void> {
  const backend = await exchangeWithBackend(session.access_token);
  useAuthStore.getState().setAuth({
    user: toUserProfile(session, backend),
    backendUserId: backend.userId,
    backendToken: backend.token,
  });
}

/** 앱 시작 시 저장된 Supabase 세션을 복구한다. 게이트에서 1회 호출. */
export async function bootstrapAuth(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) await completeLogin(data.session);
  } catch (e) {
    console.warn('[auth] 세션 복구 실패:', e);
  } finally {
    useAuthStore.getState().setBootstrapping(false);
  }
}

/** 구글 로그인 전체 흐름 (버튼 onPress 용): 로그인 → 세션 → 백엔드 교환 → 스토어. */
export async function loginWithGoogle(): Promise<boolean> {
  const session = await signInWithGoogle();
  if (!session) return false; // 취소
  await completeLogin(session);
  return true;
}

/** 로그아웃 — Supabase 세션 종료 + 스토어 초기화. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  useAuthStore.getState().logout();
}

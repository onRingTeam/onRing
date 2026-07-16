import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BackendFontSize } from '@/types/settings';
import type { BackendLang } from '@/types/meeting';
import { useAuthStore } from '@/store';
import { fetchProfile, updateChatSettings, updateProfile } from './api';

/** 내 프로필 + 채팅 설정 조회 쿼리. */
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });
}

/** 프로필(회원명) 수정 뮤테이션. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => updateProfile(name),
    onSuccess: (_data, name) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      // 세션 표시 이름도 즉시 동기화 → 홈 인사말·회의 채팅 발화자명에 반영
      useAuthStore.getState().updateUserName(name.trim());
    },
  });
}

/** 채팅 설정 수정 뮤테이션. */
export function useUpdateChatSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: { language: BackendLang; fontSize: BackendFontSize; vibration: boolean }) =>
      updateChatSettings(settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

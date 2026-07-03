import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUiStore } from '@/store';
import type { UserProfileResponse } from '@/types/settings';
import { useUpdateProfile } from '../hooks';

/**
 * 프로필 수정 바텀시트 (화면정의서 6-a-i). 회원명만 수정.
 * 소셜 로그인 사용자는 수정 불가 (6-a-ii).
 */
export function ProfileEditSheet({ profile }: { profile: UserProfileResponse }) {
  const colors = useTheme();
  const show = useUiStore((s) => s.showProfileEditSheet);
  const setShow = useUiStore((s) => s.setShowProfileEditSheet);
  const updateMutation = useUpdateProfile();

  const [name, setName] = useState(profile.name);

  // 시트가 열릴 때마다 현재 프로필명으로 초기화
  useEffect(() => {
    if (show) setName(profile.name);
  }, [show, profile.name]);

  const close = () => setShow(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || updateMutation.isPending || profile.social) return;
    try {
      await updateMutation.mutateAsync(trimmed);
      close();
    } catch (e) {
      console.warn('[settings] 프로필 수정 실패', e);
    }
  };

  const canSave = !!name.trim() && !profile.social && !updateMutation.isPending;

  return (
    <BottomSheet visible={show} onClose={close}>
      <ThemedView style={styles.content}>
        <ThemedText type="smallBold" style={styles.heading}>
          프로필 수정
        </ThemedText>

        {profile.social ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.socialNotice}>
            소셜 로그인 사용자는 프로필을 수정할 수 없습니다.
          </ThemedText>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              회원명
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]}
              placeholder="회원명을 입력하세요"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={100}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </>
        )}

        <ThemedText type="small" themeColor="textSecondary">
          이메일
        </ThemedText>
        <ThemedText type="small" style={styles.email}>
          {profile.email}
        </ThemedText>

        {!profile.social && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.8}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="저장"
          >
            <ThemedText style={styles.saveText}>
              {updateMutation.isPending ? '저장 중…' : '저장'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  heading: { marginBottom: Spacing.two },
  socialNotice: { lineHeight: 20 },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  email: { marginBottom: Spacing.two },
  saveBtn: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

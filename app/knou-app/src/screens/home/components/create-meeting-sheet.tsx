import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore, useUiStore } from '@/store';
import type { LangCode } from '@/types/meeting';
import { useCreateMeeting } from '../hooks';

const LANGUAGES: { code: LangCode; flag: string; label: string }[] = [
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
];

export function CreateMeetingSheet() {
  const router = useRouter();
  const colors = useTheme();
  const show = useUiStore((s) => s.showCreateSheet);
  const setShow = useUiStore((s) => s.setShowCreateSheet);
  const myLanguage = useSettingsStore((s) => s.myLanguage);
  const createMutation = useCreateMeeting();

  const [title, setTitle] = useState('');
  // 기본 언어는 설정값(myLanguage)을 따른다. 개설 시 여기서 다른 언어를 골라도
  // 로컬 상태만 바뀌며 설정값은 변경되지 않는다.
  const [language, setLanguage] = useState<LangCode>(myLanguage);

  // 시트를 열 때마다 현재 설정 언어로 초기화한다.
  // (시트는 항상 마운트된 채 visible만 토글되므로 open 시점에 동기화)
  useEffect(() => {
    if (show) setLanguage(myLanguage);
  }, [show, myLanguage]);

  const close = () => {
    setShow(false);
    setTitle('');
  };

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed || createMutation.isPending) return;
    try {
      const room = await createMutation.mutateAsync({ title: trimmed, language });
      close();
      router.push({
        pathname: '/(tabs)/meeting',
        params: { meetingId: String(room.meetingId), code: room.meetingCode },
      });
    } catch (e) {
      // TODO: 사용자 에러 노출(토스트)
      console.warn('[home] 회의 생성 실패', e);
    }
  };

  const canCreate = !!title.trim() && !createMutation.isPending;

  return (
    <BottomSheet visible={show} onClose={close}>
      <ThemedView style={styles.content}>
        <ThemedText type="smallBold" style={styles.heading}>
          신규 회의 만들기
        </ThemedText>

        {/* 회의명 */}
        <ThemedText type="small" themeColor="textSecondary">
          회의명
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]}
          placeholder="예: 주간 정기회의"
          placeholderTextColor={colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />

        {/* 내 언어 */}
        <ThemedText type="small" themeColor="textSecondary" style={styles.langLabel}>
          내 언어
        </ThemedText>
        <View style={styles.langRow}>
          {LANGUAGES.map((lang) => {
            const active = lang.code === language;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                activeOpacity={0.7}
                style={[
                  styles.langChip,
                  { backgroundColor: active ? colors.primary : colors.backgroundSelected },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <ThemedText style={styles.langFlag}>{lang.flag}</ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: active ? '#ffffff' : colors.text }}
                >
                  {lang.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 만들기 */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!canCreate}
          activeOpacity={0.8}
          style={[styles.createBtn, { backgroundColor: colors.primary, opacity: canCreate ? 1 : 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="회의 만들기"
        >
          <ThemedText style={styles.createText}>
            {createMutation.isPending ? '만드는 중…' : '회의 만들기'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  heading: {
    marginBottom: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  langLabel: {
    marginTop: Spacing.two,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  langFlag: {
    fontSize: 15,
  },
  createBtn: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  createText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

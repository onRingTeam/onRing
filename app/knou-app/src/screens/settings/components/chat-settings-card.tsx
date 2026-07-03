import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Toggle } from '@/components/ui/toggle';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LANGUAGES, LANG_EXAMPLE_TEXT } from '@/constants/languages';
import { fromBackendLang, toBackendLang } from '@/types/meeting';
import type { BackendFontSize, UserProfileResponse } from '@/types/settings';
import { useUpdateChatSettings } from '../hooks';

const FONT_SIZES: { value: BackendFontSize; label: string; preview: number }[] = [
  { value: 'SMALL', label: '작게', preview: 12 },
  { value: 'MEDIUM', label: '보통', preview: 14 },
  { value: 'LARGE', label: '크게', preview: 16 },
  { value: 'XLARGE', label: '매우 크게', preview: 18 },
];

export function ChatSettingsCard({ profile }: { profile: UserProfileResponse }) {
  const colors = useTheme();
  const updateMutation = useUpdateChatSettings();

  // 프로필(서버)값을 초기값으로, 변경 즉시 mutation 호출 (낙관적 로컬 반영)
  const [language, setLanguage] = useState(fromBackendLang(profile.language));
  const [fontSize, setFontSize] = useState<BackendFontSize>(profile.fontSize);
  const [vibration, setVibration] = useState(profile.vibration);

  const persist = (next: { language?: typeof language; fontSize?: BackendFontSize; vibration?: boolean }) => {
    updateMutation.mutate({
      language: toBackendLang(next.language ?? language),
      fontSize: next.fontSize ?? fontSize,
      vibration: next.vibration ?? vibration,
    });
  };

  const previewSize = FONT_SIZES.find((f) => f.value === fontSize)?.preview ?? 14;

  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
        채팅 설정
      </ThemedText>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        {/* 예시 미리보기 (6-c-i) */}
        <View style={[styles.previewRow, { borderBottomColor: colors.border }]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.rowLabel}>
            예시 미리보기
          </ThemedText>
          <View style={[styles.previewBubbleWrap, { backgroundColor: colors.backgroundSelected }]}>
            <View style={[styles.previewBubble, { backgroundColor: colors.primary }]}>
              <ThemedText style={[styles.previewText, { fontSize: previewSize }]}>
                {LANG_EXAMPLE_TEXT[language]}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* 내 언어 (6-c-ii) */}
        <View style={[styles.settingBlock, { borderBottomColor: colors.border }]}>
          <ThemedText type="small" style={styles.rowLabel}>
            내 언어
          </ThemedText>
          <View style={styles.chipRow}>
            {LANGUAGES.map((l) => {
              const active = l.code === language;
              return (
                <TouchableOpacity
                  key={l.code}
                  onPress={() => {
                    setLanguage(l.code);
                    persist({ language: l.code });
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? colors.primary : colors.backgroundSelected },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <ThemedText type="small" style={{ color: active ? '#ffffff' : colors.textSecondary }}>
                    {l.flag} {l.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 글씨 크기 (6-c-iii) */}
        <View style={[styles.settingBlock, { borderBottomColor: colors.border }]}>
          <ThemedText type="small" style={styles.rowLabel}>
            글씨 크기
          </ThemedText>
          <View style={styles.chipRow}>
            {FONT_SIZES.map((f) => {
              const active = f.value === fontSize;
              return (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => {
                    setFontSize(f.value);
                    persist({ fontSize: f.value });
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? colors.primary : colors.backgroundSelected },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <ThemedText type="small" style={{ color: active ? '#ffffff' : colors.textSecondary }}>
                    {f.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 진동 (6-c-iv) */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <ThemedText type="small">진동</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.rowSub}>
              메시지 수신 시 진동
            </ThemedText>
          </View>
          <Toggle
            value={vibration}
            onValueChange={(v) => {
              setVibration(v);
              persist({ vibration: v });
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.one,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewRow: {
    padding: Spacing.three,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  rowLabel: { fontWeight: '600' },
  rowSub: { fontSize: 12 },
  previewBubbleWrap: {
    borderRadius: 12,
    padding: Spacing.two,
    alignItems: 'flex-end',
  },
  previewBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  previewText: { color: '#ffffff' },
  settingBlock: {
    padding: Spacing.three,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  toggleText: { gap: 2 },
});

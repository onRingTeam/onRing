import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LangCode } from '@/types/meeting';
import { LANGUAGES } from '@/constants/languages';

export interface LanguageBarProps {
  selected: LangCode;
  onSelect: (code: LangCode) => void;
  onReadAloud?: () => void;
}

export function LanguageBar({ selected, onSelect, onReadAloud }: LanguageBarProps) {
  const colors = useTheme();

  return (
    <View style={[styles.bar, { borderBottomColor: colors.border }]}>
      <Feather name="globe" size={16} color={colors.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        내 언어:
      </ThemedText>

      <View style={styles.flags}>
        {LANGUAGES.map((lang) => {
          const active = lang.code === selected;
          return (
            <TouchableOpacity
              key={lang.code}
              onPress={() => onSelect(lang.code)}
              activeOpacity={0.7}
              style={[
                styles.flag,
                { backgroundColor: active ? colors.primary : colors.backgroundSelected },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${lang.label}로 번역`}
              accessibilityState={{ selected: active }}
            >
              <ThemedText style={styles.flagEmoji}>{lang.flag}</ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <TouchableOpacity
        onPress={onReadAloud}
        activeOpacity={0.8}
        style={[styles.readBtn, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel="자막 읽어주기"
      >
        <Feather name="volume-2" size={14} color="#ffffff" />
        <ThemedText style={styles.readText}>읽어주기</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  flag: {
    width: 34,
    height: 30,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagEmoji: {
    fontSize: 16,
  },
  divider: {
    width: 1,
    height: 20,
    marginHorizontal: Spacing.one,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    marginLeft: 'auto',
  },
  readText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});

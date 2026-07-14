import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslationModelStore } from '@/store';

/**
 * 온디바이스 번역 모델(ML Kit) 다운로드 진행 배너.
 *
 * 모델은 최초 1회 런타임 다운로드(언어당 ~30MB)가 필요해 네트워크에 따라 수십 초 걸릴 수 있다.
 * 그동안 번역이 비어 보여 "고장"으로 오해하기 쉬우므로, 받는 중임을 명시적으로 알린다.
 * 다운로드가 없으면(=이미 준비됨) 아무것도 렌더링하지 않는다. (translate.ts 상태와 연동)
 */
export function TranslationStatusBanner() {
  const colors = useTheme();
  const downloading = useTranslationModelStore((s) => s.downloading);

  if (downloading.length === 0) return null;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.primaryLight, borderColor: colors.border },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="번역 모델을 다운로드하는 중입니다"
    >
      <ActivityIndicator size="small" color={colors.accent} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        번역 모델 다운로드 중… 처음 한 번만 받으면 이후엔 빨라져요.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
});

// 1. Import
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  type PrivacyBlock,
} from './privacy-content';
import { styles } from './privacy-screen.styles';

// 2. 페이지(함수) 시작
export function PrivacyScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  // 3. Return
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* 뒤로가기 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <Feather name="chevron-left" size={16} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              개인정보 처리방침
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              시행일 {PRIVACY_EFFECTIVE_DATE}
            </ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
            {PRIVACY_INTRO}
          </ThemedText>

          {PRIVACY_SECTIONS.map((section) => (
            <View
              key={section.title}
              style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
            >
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
              {section.blocks.map((block, i) => (
                <PrivacyBlockView key={i} block={block} bulletColor={colors.accent} />
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** 문단 또는 불릿 목록 한 블록을 렌더링. */
function PrivacyBlockView({ block, bulletColor }: { block: PrivacyBlock; bulletColor: string }) {
  if (block.type === 'paragraph') {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.paragraph}>
        {block.text}
      </ThemedText>
    );
  }
  return (
    <View style={styles.bulletList}>
      {block.items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={[styles.bulletDot, { backgroundColor: bulletColor }]} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.bulletText}>
            {item}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

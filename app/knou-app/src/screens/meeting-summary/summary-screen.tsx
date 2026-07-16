import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';
import { ThemedView } from '@/components/themed-view';

export function SummaryScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScreenPlaceholder
          title="회의 요약"
          description="회의가 끝난 뒤 AI 요약과 자막을 확인하는 화면입니다."
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
});

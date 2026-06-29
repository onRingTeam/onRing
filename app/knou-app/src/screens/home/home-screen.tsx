import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';
import { ThemedView } from '@/components/themed-view';

export function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScreenPlaceholder
          title="홈"
          description="회의 시작과 최근 회의록을 한눈에 볼 수 있는 화면입니다."
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
});

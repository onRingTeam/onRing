import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';
import { ThemedView } from '@/components/themed-view';

export function MeetingScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScreenPlaceholder
          title="회의 진행"
          description="실시간 자막과 번역으로 회의를 진행하는 화면입니다."
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
});

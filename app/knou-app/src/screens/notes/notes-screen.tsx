import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenPlaceholder } from '@/components/ui/screen-placeholder';
import { ThemedView } from '@/components/themed-view';

export function NotesScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScreenPlaceholder
          title="회의록"
          description="지난 회의 기록을 검색하고 즐겨찾기로 관리하는 화면입니다."
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
});

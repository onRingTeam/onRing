import { StyleSheet } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useUiStore } from '@/store';

export function CreateMeetingSheet() {
  const show = useUiStore((s) => s.showCreateSheet);
  const setShow = useUiStore((s) => s.setShowCreateSheet);

  return (
    <BottomSheet visible={show} onClose={() => setShow(false)}>
      <ThemedView style={styles.content}>
        <ThemedText type="smallBold">신규 회의 만들기</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          (실제 폼은 다음 단계)
        </ThemedText>
      </ThemedView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
});

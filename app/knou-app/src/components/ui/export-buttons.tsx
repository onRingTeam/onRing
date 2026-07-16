import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface ExportButtonsProps {
  onPdf?: () => void;
  onTxt?: () => void;
}

export function ExportButtons({ onPdf, onTxt }: ExportButtonsProps) {
  return (
    <View style={styles.container}>
      {onPdf && (
        <TouchableOpacity onPress={onPdf} style={styles.button} activeOpacity={0.7}>
          <ThemedText type="small">PDF</ThemedText>
        </TouchableOpacity>
      )}
      {onTxt && (
        <TouchableOpacity onPress={onTxt} style={styles.button} activeOpacity={0.7}>
          <ThemedText type="small">TXT</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface SettingRowProps extends ViewProps {
  label: string;
  sub?: string;
  right?: React.ReactNode;
}

export function SettingRow({ label, sub, right, style, ...props }: SettingRowProps) {
  return (
    <View style={[styles.row, style]} {...props}>
      <View style={styles.left}>
        <ThemedText type="small">{label}</ThemedText>
        {sub && (
          <ThemedText type="small" themeColor="textSecondary">
            {sub}
          </ThemedText>
        )}
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  left: {
    flex: 1,
    gap: Spacing.half,
  },
  right: {
    marginLeft: Spacing.two,
  },
});

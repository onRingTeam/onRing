import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export interface StatCardProps {
  stats: Array<{ label: string; value: string }>;
}

export function StatCard({ stats }: StatCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.grid}>
        {stats.map((stat, idx) => (
          <View key={idx} style={styles.item}>
            <ThemedText type="smallBold">{stat.value}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {stat.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  item: {
    alignItems: 'center',
    gap: Spacing.one,
  },
});

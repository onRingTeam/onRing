import { Switch, type SwitchProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type ToggleProps = SwitchProps;

export function Toggle({ ...props }: ToggleProps) {
  const theme = useTheme();

  return <Switch {...props} thumbColor={theme.text} trackColor={{ false: theme.textSecondary, true: theme.text }} />;
}

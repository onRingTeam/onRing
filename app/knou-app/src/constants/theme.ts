/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A2B4E',
    background: '#F4F6FA',
    backgroundElement: '#ffffff',
    backgroundSelected: '#EAF0FA',
    textSecondary: '#6B7A96',
    primary: '#1A3461',
    primaryLight: '#EAF0FA',
    accent: '#2D67C8',
    error: '#D93B3B',
    border: 'rgba(26, 52, 97, 0.1)',
  },
  dark: {
    text: '#E8EDF5',
    background: '#0E1626',
    backgroundElement: '#1A2438',
    backgroundSelected: '#26334D',
    textSecondary: '#8A99B8',
    primary: '#4A90D9',
    primaryLight: '#1E2D4A',
    accent: '#4A90D9',
    error: '#E05656',
    border: 'rgba(232, 237, 245, 0.1)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

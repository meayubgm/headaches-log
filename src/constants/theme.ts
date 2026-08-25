/**
 * アプリ全体のデザイントークン。
 *
 * 色・スペーシングの実体は `design-tokens.json` に置き、このファイルと
 * `tailwind.config.js`（NativeWind）の両方がそれを読むことで二重管理を避ける。
 * tailwind.config.js は素の Node が読むため TypeScript の theme.ts を require できず、
 * JSON を共通の出所にしている。
 */

import '@/global.css';

import { Platform } from 'react-native';

import tokens from '@/constants/design-tokens.json';

export const Colors = tokens.colors;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * 痛み度合い4段階（軽→重）の配色。単一色相(赤系)×明度/彩度の段階変化による
 * ordinalスケール（dataviz スキルの validate_palette.js --ordinal で検証済み）。
 * アイコン形状差（face-meh→face-frown→face-grimace→face-dizzy）と併用し、
 * 色だけに依存しない識別を担保する。
 */
export const PainColors = tokens.painColors;

export const Spacing = tokens.spacing;

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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

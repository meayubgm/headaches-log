const tokens = require('./src/constants/design-tokens.json');

/**
 * 色・スペーシングの実体は src/constants/design-tokens.json（唯一の出所）。
 * src/constants/theme.ts も同じ JSON を読むため、二重管理にならない。
 */
const spacing = Object.fromEntries(
  Object.entries(tokens.spacing).map(([key, value]) => [key, `${value}px`]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        fg: { DEFAULT: tokens.colors.light.text, dark: tokens.colors.dark.text },
        'fg-muted': {
          DEFAULT: tokens.colors.light.textSecondary,
          dark: tokens.colors.dark.textSecondary,
        },
        bg: { DEFAULT: tokens.colors.light.background, dark: tokens.colors.dark.background },
        surface: {
          DEFAULT: tokens.colors.light.backgroundElement,
          dark: tokens.colors.dark.backgroundElement,
        },
        'surface-selected': {
          DEFAULT: tokens.colors.light.backgroundSelected,
          dark: tokens.colors.dark.backgroundSelected,
        },
        accent: { DEFAULT: tokens.colors.light.accent, dark: tokens.colors.dark.accent },
        danger: { DEFAULT: tokens.colors.light.danger, dark: tokens.colors.dark.danger },
        pain: {
          1: tokens.painColors.light[0],
          2: tokens.painColors.light[1],
          3: tokens.painColors.light[2],
          4: tokens.painColors.light[3],
          'dark-1': tokens.painColors.dark[0],
          'dark-2': tokens.painColors.dark[1],
          'dark-3': tokens.painColors.dark[2],
          'dark-4': tokens.painColors.dark[3],
        },
      },
      spacing,
    },
  },
  plugins: [],
};

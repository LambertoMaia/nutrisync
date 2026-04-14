/**
 * Nutrilho design tokens — translated from `web-prototype/styles.css`.
 * Use `NutrilhoColors` and `FontFamily` for new UI; `Colors` supports `useThemeColor` / navigation theming.
 */

import { Platform } from 'react-native';

/** Sans: loaded via `useFonts` in `app/_layout.tsx`. Serif: system stack (no extra package — avoids Metro resolve issues). */
export const FontFamily = {
  sansRegular: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  serifBold: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  /** Same family as `serifBold`; use with `fontStyle: 'italic'` for italic display. */
  serifBoldItalic: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
} as const;

/** Fallback when custom fonts are not yet loaded (should be rare after root layout gates render). */
export const FontFamilyFallback = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }) as string,
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
};

export const NutrilhoColors = {
  green: '#4a7c2f',
  greenD: '#2e5a18',
  greenL: '#eaf2e0',
  greenMid: '#6a9c4a',
  brown: '#3d2b1a',
  brownBtn: '#5c3d20',
  beige: '#f5f0e8',
  beigeD: '#ede5d4',
  beigeMid: '#d4c9b2',
  cream: '#faf7f2',
  white: '#ffffff',
  text: '#1e1a12',
  textM: '#5a4e3a',
  textL: '#8a7a65',
  screenBg: '#ddd8ce',
  link: '#4a7c2f',
  pbadgeNewBg: '#fff3cc',
  pbadgeNewText: '#7a4f00',
  pbadgeDoneBg: '#e8f0fb',
  pbadgeDoneText: '#1a3a6b',
} as const;

export const Radii = {
  xs: 5,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 22,
} as const;

export const Shadows = {
  nav: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: 'rgba(46,90,24,0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 3,
  },
  cardLarge: {
    shadowColor: 'rgba(46,90,24,0.18)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 48,
    elevation: 6,
  },
  primaryButton: {
    shadowColor: '#4a7c2f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomNav: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  navPadX: 19,
  sectionPadX: 21,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

/** Legacy hook + navigation — light theme matches Nutrilho prototype; dark uses the same palette for now. */
export const Colors = {
  light: {
    text: NutrilhoColors.text,
    background: NutrilhoColors.cream,
    tint: NutrilhoColors.green,
    icon: NutrilhoColors.textM,
    tabIconDefault: NutrilhoColors.textL,
    tabIconSelected: NutrilhoColors.green,
  },
  dark: {
    text: NutrilhoColors.cream,
    background: '#1a1814',
    tint: NutrilhoColors.greenL,
    icon: NutrilhoColors.textL,
    tabIconDefault: NutrilhoColors.textL,
    tabIconSelected: NutrilhoColors.greenL,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

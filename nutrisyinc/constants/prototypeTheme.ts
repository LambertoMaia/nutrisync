/**
 * Tokens aligned with `web-prototype/styles.css` (:root variables).
 * Use for screens ported from the HTML prototype (login, cadastro, etc.).
 */
import { Platform } from 'react-native';

export const P = {
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
  errorBg: '#fee',
  errorBorder: '#fcc',
  errorText: '#c33',
  successBg: '#e8f5e9',
  successBorder: '#c8e6c9',
  successText: '#2e7d32',
  verifyBg: '#fff3cc',
} as const;

export const radius = { sm: 8, md: 10, lg: 14, xl: 22 } as const;

/** Playfair-like on iOS; fallback serif elsewhere (matches landing). */
export const fontSerif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

/** Body: prototype uses DM Sans; use system sans until fonts are loaded. */
export const fontSans = undefined as string | undefined;

/** Logo (`assets/images/logo.svg`) sizes in dp — nav bar vs splash. */
export const logoSize = {
  nav: 36,
  splash: 88,
} as const;

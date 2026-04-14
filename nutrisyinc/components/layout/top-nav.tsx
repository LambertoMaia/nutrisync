import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { LogoMark, type LogoMarkProps } from '@/components/logo-mark';
import { NutrilhoColors, Shadows, Spacing } from '@/constants/theme';

export type TopNavProps = {
  /** Right side: nav buttons or profile slot */
  right?: ReactNode;
  /** Optional: omit default logo and render custom left */
  left?: ReactNode;
  logoTagline?: LogoMarkProps['tagline'];
  onLogoPress?: LogoMarkProps['onPress'];
  style?: ViewStyle;
};

const NAV_HEIGHT = 62;

export function TopNav({ right, left, logoTagline, onLogoPress, style }: TopNavProps) {
  return (
    <View style={[styles.bar, style]}>
      {left ?? <LogoMark onPress={onLogoPress} tagline={logoTagline} />}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: NAV_HEIGHT,
    paddingHorizontal: Spacing.navPadX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NutrilhoColors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NutrilhoColors.beigeD,
    ...Shadows.nav,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

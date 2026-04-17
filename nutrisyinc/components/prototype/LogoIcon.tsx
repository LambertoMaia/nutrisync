import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import LogoSvg from '@/assets/images/logo.svg';

import { logoSize } from '@/constants/prototypeTheme';

type Props = {
  /** Square edge length in density-independent pixels. Defaults to nav size; splash uses `logoSize.splash`. */
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Renders the SVG slightly larger than the layout box and clips.
 * The asset uses an embedded PNG + clipPath; some platforms draw 1px hairlines at the clip edges
 * (seen as horizontal lines top/bottom). Overscan hides those without editing the SVG.
 */
const OVERSCAN = 1.12;

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  svg: {
    borderWidth: 0,
    outlineWidth: 0,
  },
});

export function LogoIcon({ size = logoSize.nav, accessibilityLabel = 'Nutrilho', style }: Props) {
  const inner = size * OVERSCAN;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.clip, { width: size, height: size }, style]}>
      <LogoSvg
        accessible={false}
        width={inner}
        height={inner}
        focusable={false}
        style={styles.svg}
      />
    </View>
  );
}

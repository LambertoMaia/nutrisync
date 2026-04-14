import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, NutrilhoColors } from '@/constants/theme';

export type LogoMarkProps = {
  onPress?: () => void;
  tagline?: string;
};

const DEFAULT_TAG = 'sua receita, nossa marmita';

/** Fits TopNav (~62px row); matches prior emoji mark footprint. */
const LOGO_MARK_SIZE = 36;

export function LogoMark({ onPress, tagline = DEFAULT_TAG }: LogoMarkProps) {
  const inner = (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Image
          source={require('@/assets/images/logo.svg')}
          style={styles.iconImage}
          contentFit="contain"
        />
      </View>
      <View>
        <Text style={styles.name}>Nutrilho</Text>
        <Text style={styles.tag}>{tagline}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress}>
        {inner}
      </Pressable>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  icon: {
    width: LOGO_MARK_SIZE,
    height: LOGO_MARK_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontFamily: FontFamily.serifBold,
    fontSize: 17,
    fontWeight: '700',
    color: NutrilhoColors.greenD,
    letterSpacing: -0.2,
  },
  tag: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 9,
    color: NutrilhoColors.textL,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});

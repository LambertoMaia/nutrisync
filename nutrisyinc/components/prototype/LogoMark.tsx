import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontSerif, logoSize, P } from '@/constants/prototypeTheme';

import { LogoIcon } from './LogoIcon';

type Props = {
  onPress?: () => void;
  /** Icon size in px (default matches `web-prototype` nav ~36). */
  iconSize?: number;
};

export function LogoMark({ onPress, iconSize = logoSize.nav }: Props) {
  const content = (
    <View style={styles.logoMark}>
      <LogoIcon size={iconSize} style={styles.logoIconOnly} />
      <View>
        <Text style={styles.logoName}>Nutrilho</Text>
        <Text style={styles.logoTag}>sua receita, nossa marmita</Text>
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  logoMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logoIconOnly: {
    flexShrink: 0,
  },
  logoName: {
    fontFamily: fontSerif,
    fontSize: 17,
    fontWeight: '700',
    color: P.greenD,
    letterSpacing: -0.2,
  },
  logoTag: {
    fontSize: 9,
    fontWeight: '500',
    color: P.textL,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});

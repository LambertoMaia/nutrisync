import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { NutrilhoColors, Radii } from '@/constants/theme';

export type CardProps = ViewProps & {
  children: ReactNode;
};

/** Standard bordered card from `.card` in the prototype. */
export function Card({ style, children, ...rest }: CardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NutrilhoColors.white,
    borderWidth: 1,
    borderColor: NutrilhoColors.beigeD,
    borderRadius: Radii.lg,
    paddingVertical: 18,
    paddingHorizontal: 19,
    marginBottom: 10,
  },
});

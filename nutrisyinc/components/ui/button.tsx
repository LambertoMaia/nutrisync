import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { FontFamily, NutrilhoColors, Radii, Shadows } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'green';

export type ButtonProps = {
  title: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftSlot?: ReactNode;
};

export function Button({
  title,
  variant = 'primary',
  onPress,
  disabled,
  style,
  textStyle,
  leftSlot,
}: ButtonProps) {
  const v = variantStyles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        v.container,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {leftSlot}
      <Text style={[styles.textBase, v.text, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  textBase: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88 },
});

const variantStyles: Record<
  ButtonVariant,
  { container: ViewStyle; text: TextStyle }
> = {
  primary: {
    container: {
      backgroundColor: NutrilhoColors.green,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: Radii.md,
      ...Shadows.primaryButton,
    },
    text: { color: NutrilhoColors.white },
  },
  secondary: {
    container: {
      backgroundColor: NutrilhoColors.white,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: Radii.md,
      borderWidth: 1.5,
      borderColor: NutrilhoColors.beigeD,
    },
    text: { color: NutrilhoColors.brownBtn },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: Radii.sm,
    },
    text: {
      color: NutrilhoColors.textM,
      fontFamily: FontFamily.sansMedium,
      fontSize: 13,
      fontWeight: '500',
    },
  },
  green: {
    container: {
      backgroundColor: NutrilhoColors.green,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: Radii.sm,
    },
    text: {
      color: NutrilhoColors.white,
      fontFamily: FontFamily.sansMedium,
      fontSize: 13,
      fontWeight: '500',
    },
  },
};

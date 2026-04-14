import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, NutrilhoColors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'defaultSemiBold'
    | 'title'
    | 'subtitle'
    | 'link'
    | 'display'
    | 'headline'
    | 'hero'
    | 'body'
    | 'bodySmall'
    | 'caption'
    | 'captionUpper'
    | 'serifLead';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'display' ? styles.display : undefined,
        type === 'headline' ? styles.headline : undefined,
        type === 'hero' ? styles.hero : undefined,
        type === 'body' ? styles.body : undefined,
        type === 'bodySmall' ? styles.bodySmall : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'captionUpper' ? styles.captionUpper : undefined,
        type === 'serifLead' ? styles.serifLead : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: FontFamily.serifBold,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 20,
    lineHeight: 28,
  },
  link: {
    fontFamily: FontFamily.sansMedium,
    lineHeight: 22,
    fontSize: 16,
    color: NutrilhoColors.link,
  },
  display: {
    fontFamily: FontFamily.serifBold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  headline: {
    fontFamily: FontFamily.serifBold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  hero: {
    fontFamily: FontFamily.serifBoldItalic,
    fontSize: 28,
    lineHeight: 34,
    fontStyle: 'italic',
    fontWeight: '700',
    color: NutrilhoColors.green,
  },
  body: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    lineHeight: 22,
  },
  caption: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  captionUpper: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  serifLead: {
    fontFamily: FontFamily.serifBold,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '700',
  },
});

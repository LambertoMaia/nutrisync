import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily, NutrilhoColors, Spacing } from '@/constants/theme';

import { NavBackButton } from './nav-back';
import { TopNav } from './top-nav';

export type ScreenScaffoldProps = {
  title: string;
  subtitle?: string;
  /** Show back control (stack screens). */
  showBack?: boolean;
  children?: ReactNode;
};

/** Shared chrome for stack placeholders: top safe area, optional back, title, scroll body. */
export function ScreenScaffold({ title, subtitle, showBack, children }: ScreenScaffoldProps) {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <TopNav left={showBack ? <NavBackButton /> : undefined} />
      </SafeAreaView>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NutrilhoColors.cream,
  },
  safeTop: {
    backgroundColor: NutrilhoColors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.sectionPadX,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.serifBold,
    fontSize: 22,
    fontWeight: '700',
    color: NutrilhoColors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NutrilhoColors.textM,
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
});

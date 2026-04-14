import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, NutrilhoColors, Shadows } from '@/constants/theme';

export type BottomNavItem = {
  key: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onPress?: () => void;
};

export type BottomNavProps = {
  items: BottomNavItem[];
};

/** Matches `.bottom-nav` / `.bnav-btn` from the prototype. */
export function BottomNav({ items }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: item.active }}
          onPress={item.onPress}
          style={({ pressed }) => [styles.btn, item.active && styles.btnOn, pressed && styles.pressed]}>
          <View style={styles.iconSlot}>{item.icon}</View>
          <Text style={[styles.lbl, item.active && styles.lblOn]} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: NutrilhoColors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: NutrilhoColors.beigeD,
    paddingTop: 8,
    ...Shadows.bottomNav,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  btnOn: {},
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  lbl: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 9,
    fontWeight: '500',
    color: NutrilhoColors.textL,
  },
  lblOn: {
    color: NutrilhoColors.green,
  },
  pressed: { opacity: 0.85 },
});

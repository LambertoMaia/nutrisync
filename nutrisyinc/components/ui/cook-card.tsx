import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, NutrilhoColors, Radii, Shadows } from '@/constants/theme';
import type { Cook } from '@/types/models';

export type CookCardProps = {
  cook: Cook;
  onPress?: () => void;
};

export function CookCard({ cook, onPress }: CookCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <View style={styles.imageArea}>
        <Text style={styles.emoji}>{cook.emoji ?? '👩‍🍳'}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {cook.name}
        </Text>
        <Text style={styles.loc} numberOfLines={1}>
          {cook.location}
        </Text>
        <View style={styles.tags}>
          {cook.tags.map((t, i) => (
            <View
              key={`${cook.id}-${t}`}
              style={[styles.tag, cook.highlightFirstTag && i === 0 && styles.tagHighlight]}>
              <Text style={[styles.tagText, cook.highlightFirstTag && i === 0 && styles.tagTextHi]}>
                {t}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <Text style={styles.stars}>{cook.ratingLabel}</Text>
          <Text style={styles.price}>{cook.priceLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: NutrilhoColors.white,
    borderWidth: 1,
    borderColor: NutrilhoColors.beigeD,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    marginBottom: 12,
    ...Shadows.card,
  },
  pressed: { opacity: 0.92 },
  imageArea: {
    height: 130,
    backgroundColor: NutrilhoColors.greenL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 44 },
  body: { padding: 14 },
  name: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: NutrilhoColors.text,
    marginBottom: 2,
  },
  loc: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: NutrilhoColors.textL,
    marginBottom: 8,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 5,
    backgroundColor: NutrilhoColors.beige,
  },
  tagHighlight: {
    backgroundColor: NutrilhoColors.greenL,
  },
  tagText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10,
    color: NutrilhoColors.textM,
  },
  tagTextHi: {
    color: NutrilhoColors.greenD,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stars: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: NutrilhoColors.brownBtn,
  },
  price: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: NutrilhoColors.greenD,
  },
});

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavBackButton } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Routes } from '@/constants/routes';
import { FontFamily, NutrilhoColors, Spacing } from '@/constants/theme';

const PLANS = [
  {
    emoji: '🥗',
    title: 'Emagrecimento',
    desc: '1.400–1.600 kcal · baixo carbo · alto proteico',
    tags: ['Low carb', '5 refeições/dia'],
    highlight: true,
  },
  {
    emoji: '💪',
    title: 'Hipertrofia',
    desc: '2.800–3.200 kcal · alto proteico · rico em carbos',
    tags: ['Alto proteico', '6 refeições/dia'],
    highlight: false,
  },
  {
    emoji: '⚖️',
    title: 'Manutenção',
    desc: '2.000–2.200 kcal · equilibrado · variado',
    tags: ['Equilibrado', '5 refeições/dia'],
    highlight: false,
  },
  {
    emoji: '🌱',
    title: 'Vegano saudável',
    desc: '1.800 kcal · 100% vegetal · nutritivo',
    tags: ['Vegano', 'Sem animal'],
    highlight: false,
  },
] as const;

export default function CardapiosScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topBar}>
          <NavBackButton />
          <Text style={styles.topTitle}>Cardápios sugeridos</Text>
          <View style={styles.topSpacer} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.scroll} style={styles.scrollView}>
        <View style={styles.section}>
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Escolha um plano padrão — cozinheiros parceiros preparam tudo para você, mesmo sem receita de nutricionista.
            </Text>
          </View>
          {PLANS.map((p) => (
            <Pressable
              key={p.title}
              onPress={() => router.push(Routes.marketplace)}
              style={({ pressed }) => [pressed && styles.cardPressed]}>
              <Card style={[styles.planCard, p.highlight && styles.planCardHi]}>
                <View style={styles.planRow}>
                  <Text style={styles.planEmoji}>{p.emoji}</Text>
                  <View style={styles.planBody}>
                    <Text style={styles.planTitle}>{p.title}</Text>
                    <Text style={styles.planDesc}>{p.desc}</Text>
                    <View style={styles.tags}>
                      {p.tags.map((t) => (
                        <View key={t} style={[styles.tag, p.highlight && styles.tagHi]}>
                          <Text style={[styles.tagText, p.highlight && styles.tagTextHi]}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NutrilhoColors.cream },
  safeTop: { backgroundColor: NutrilhoColors.white },
  topBar: {
    height: 62,
    paddingHorizontal: Spacing.navPadX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 15,
    fontWeight: '700',
    color: NutrilhoColors.text,
  },
  topSpacer: { width: 40 },
  scrollView: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.sectionPadX,
    paddingTop: 18,
    paddingBottom: 32,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  section: { gap: 10 },
  banner: {
    backgroundColor: NutrilhoColors.greenL,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: NutrilhoColors.green,
    marginBottom: 8,
  },
  bannerText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textM,
    lineHeight: 20,
  },
  planCard: {
    marginBottom: 0,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  planCardHi: {
    borderWidth: 2,
    borderColor: NutrilhoColors.green,
  },
  cardPressed: { opacity: 0.92 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  planEmoji: { fontSize: 34 },
  planBody: { flex: 1 },
  planTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: NutrilhoColors.text,
    marginBottom: 2,
  },
  planDesc: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: NutrilhoColors.textL,
    marginBottom: 8,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 5,
    backgroundColor: NutrilhoColors.beige,
  },
  tagHi: {
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
  arrow: {
    fontSize: 18,
    color: NutrilhoColors.green,
  },
});

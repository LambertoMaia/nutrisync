import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/prototype/LogoMark';
import { FontFamily, NutrilhoColors, Shadows, Spacing } from '@/constants/theme';

const serif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

/** Palette from web-prototype/styles.css */
const C = {
  green: '#4a7c2f',
  greenD: '#2e5a18',
  greenL: '#eaf2e0',
  brownBtn: '#5c3d20',
  beige: '#f5f0e8',
  beigeD: '#ede5d4',
  cream: '#faf7f2',
  white: '#ffffff',
  text: '#1e1a12',
  textM: '#5a4e3a',
  textL: '#8a7a65',
};

const steps = [
  { num: '1', title: 'Crie sua conta', body: 'Cadastre perfil com objetivo e restrições alimentares.' },
  { num: '2', title: 'Envie sua receita', body: 'Foto do plano nutricional ou preencha um formulário.' },
  { num: '3', title: 'Cozinheiro monta', body: 'Profissional parceiro prepara conforme prescrito.' },
  { num: '4', title: 'Receba e avalie', body: 'Marmitas chegam prontas. Avalie e repita semanalmente.' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const stepCardWidthStyle =
    windowWidth >= 420 ? styles.stepCardWide : styles.stepCardFull;

  const tap = useCallback((action?: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action?.();
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topnav}>
          <LogoMark />
          <View style={styles.navRight}>
            <Pressable
              onPress={() => tap(() => router.push('/login'))}
              style={({ pressed }) => [styles.btnNav, styles.btnGhost, pressed && styles.pressed]}>
              <Text style={styles.btnGhostText}>Entrar</Text>
            </Pressable>
            <Pressable
              onPress={() => tap(() => router.push('/register'))}
              style={({ pressed }) => [styles.btnNav, styles.btnGreen, pressed && styles.pressed]}>
              <Text style={styles.btnGreenText}>Cadastrar</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroBadge}>🥦 Marketplace de Marmitas Personalizadas</Text>
          <Text style={styles.heroTitleBlock}>
            <Text style={styles.heroTitle}>Você tem a receita.</Text>
            {'\n'}
            <Text style={styles.heroTitleEm}>A gente entrega</Text>
            <Text style={styles.heroTitle}> a marmita.</Text>
          </Text>
          <Text style={styles.heroP}>
            Envie o plano do seu nutricionista e cozinheiros parceiros montam suas marmitas exatamente como
            prescrito. Sem improvisar. Sem furar a dieta.
          </Text>
          <View style={styles.heroBtns}>
            <Pressable
              onPress={() => tap(() => router.push('/register'))}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}>
              <Text style={styles.btnPrimaryText}>Quero pedir minhas marmitas</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.secTitle}>Como funciona</Text>
          <Text style={styles.secSub}>Do consultório à sua mesa em 4 passos</Text>
          <View style={styles.stepsGrid}>
            {steps.map((s) => (
              <View key={s.num} style={[styles.stepCard, styles.stepCardSurface, stepCardWidthStyle]}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{s.num}</Text>
                </View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepBody}>{s.body}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.ctaBand}>
          <View style={styles.ctaInner}>
            <View style={styles.ctaCopy}>
              <Text style={styles.ctaKicker}>Não tem receita?</Text>
              <Text style={styles.ctaHead}>Use nosso cardápio sugerido</Text>
              <Text style={styles.ctaDesc}>
                Planos de emagrecimento, hipertrofia ou manutenção — preparados por cozinheiros reais.
              </Text>
            </View>
            <Pressable
              onPress={() => tap(() => router.push('/explore'))}
              style={({ pressed }) => [styles.btnPrimary, styles.ctaBtn, pressed && styles.pressed]}>
              <Text style={styles.btnPrimaryText}>Ver cardápios →</Text>
            </Pressable>
          </View>
        </View>

        {__DEV__ ? (
          <View style={styles.debugWrap}>
            <Pressable
              onPress={() => tap(() => router.push('/home'))}
              style={({ pressed }) => [styles.debugBtn, pressed && styles.pressed]}>
              <Text style={styles.debugBtnText}>Debug — Home cliente (home-user)</Text>
            </Pressable>
          </View>
        ) : null}
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
    backgroundColor: C.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.beigeD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topnav: {
    height: 62,
    paddingHorizontal: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnNav: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textM,
  },
  btnGreen: {
    backgroundColor: C.green,
  },
  btnGreenText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  pressed: {
    opacity: 0.9,
  },
  heroBtns: {
    alignSelf: 'stretch',
    maxWidth: 400,
    width: '100%',
    marginTop: 12,
  },
  btnPrimary: {
    width: '100%',
    paddingVertical: 17,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryButton,
  },
  btnPrimaryText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    letterSpacing: 0.2,
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: Spacing.sectionPadX,
    alignItems: 'center',
    backgroundColor: NutrilhoColors.cream,
  },
  heroBadge: {
    fontFamily: FontFamily.sansSemiBold,
    backgroundColor: NutrilhoColors.greenL,
    color: NutrilhoColors.greenD,
    fontSize: 11,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74,124,47,0.25)',
    marginBottom: 16,
    letterSpacing: 0.3,
    overflow: 'hidden',
  },
  heroTitleBlock: {
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  heroTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 28,
    fontWeight: '700',
    color: NutrilhoColors.text,
    lineHeight: 34,
  },
  heroTitleEm: {
    fontFamily: FontFamily.serifBoldItalic,
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: '700',
    color: NutrilhoColors.green,
    lineHeight: 34,
  },
  heroPWrap: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    marginBottom: 8,
  },
  heroP: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NutrilhoColors.textM,
    textAlign: 'left',
    lineHeight: 24,
  },
  heroCtaWrap: {
    alignSelf: 'stretch',
    maxWidth: 400,
    width: '100%',
    marginTop: 12,
  },
  heroCtaBtn: {
    width: '100%',
    paddingVertical: 17,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  heroCtaBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  section: {
    paddingVertical: 24,
    paddingHorizontal: Spacing.sectionPadX,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  secTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 22,
    fontWeight: '700',
    color: NutrilhoColors.text,
    marginBottom: 6,
  },
  secSub: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textL,
    marginBottom: 22,
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stepCard: {
    marginBottom: 0,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  stepCardSurface: {
    backgroundColor: NutrilhoColors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(74,124,47,0.12)',
    ...Shadows.card,
  },
  stepCardFull: {
    width: '100%',
  },
  stepCardWide: {
    width: '47%',
    flexGrow: 1,
  },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: NutrilhoColors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },
  stepNumText: {
    fontFamily: FontFamily.sansBold,
    color: NutrilhoColors.white,
    fontSize: 12,
  },
  stepTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: NutrilhoColors.text,
    marginBottom: 6,
  },
  stepBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: NutrilhoColors.textM,
    lineHeight: 19,
  },
  ctaBand: {
    backgroundColor: C.greenL,
    paddingVertical: 29,
    paddingHorizontal: 21,
  },
  ctaInner: {
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
    gap: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  ctaCopy: {
    flex: 1,
    minWidth: 220,
  },
  ctaKicker: {
    fontSize: 10,
    fontWeight: '700',
    color: C.green,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  ctaHead: {
    fontFamily: serif,
    fontSize: 19,
    fontWeight: '700',
    color: C.text,
    marginBottom: 6,
  },
  ctaDesc: {
    fontSize: 13,
    color: C.textM,
    lineHeight: 21,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
  },
  debugWrap: {
    paddingHorizontal: 21,
    paddingTop: 8,
    paddingBottom: 28,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  debugBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(92,61,32,0.35)',
    backgroundColor: 'rgba(92,61,32,0.08)',
    alignItems: 'center',
  },
  debugBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.brownBtn,
  },
  bottomSpacer: {
    height: 24,
  },
});

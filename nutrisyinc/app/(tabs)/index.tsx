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

const serif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

const steps = [
  { num: '1', title: 'Crie sua conta', body: 'Cadastre perfil com objetivo e restrições alimentares.' },
  { num: '2', title: 'Envie sua receita', body: 'Foto do plano nutricional ou preencha um formulário.' },
  { num: '3', title: 'Cozinheiro monta', body: 'Profissional parceiro prepara conforme prescrito.' },
  { num: '4', title: 'Receba e avalie', body: 'Marmitas chegam prontas. Avalie e repita semanalmente.' },
];

function LogoMark() {
  return (
    <View style={styles.logoMark}>
      <View style={styles.logoIcon}>
        <Text style={styles.logoIconGlyph}>🌿</Text>
      </View>
      <View>
        <Text style={styles.logoName}>NutriSync</Text>
        <Text style={styles.logoTag}>sua receita, nossa marmita</Text>
      </View>
    </View>
  );
}

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
              onPress={() => tap()}
              style={({ pressed }) => [styles.btnNav, styles.btnGhost, pressed && styles.pressed]}>
              <Text style={styles.btnGhostText}>Entrar</Text>
            </Pressable>
            <Pressable
              onPress={() => tap()}
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
              onPress={() => tap()}
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
              <View key={s.num} style={[styles.stepCard, stepCardWidthStyle]}>
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
              onPress={() => tap()}
              style={({ pressed }) => [styles.btnPrimary, styles.ctaBtn, pressed && styles.pressed]}>
              <Text style={styles.btnPrimaryText}>Ver cardápios →</Text>
            </Pressable>
          </View>
        </View>
      {/* <View style={styles.bottomSpacer} /> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
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
  logoMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconGlyph: {
    fontSize: 18,
  },
  logoName: {
    fontFamily: serif,
    fontSize: 17,
    fontWeight: '700',
    color: C.greenD,
    letterSpacing: -0.2,
  },
  logoTag: {
    fontSize: 9,
    fontWeight: '500',
    color: C.textL,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: 1,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 21,
    alignItems: 'center',
    backgroundColor: C.cream,
  },
  heroBadge: {
    backgroundColor: C.greenL,
    color: C.greenD,
    fontSize: 11,
    fontWeight: '600',
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
    fontFamily: serif,
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
    lineHeight: 34,
  },
  heroTitleEm: {
    fontFamily: serif,
    fontSize: 28,
    fontWeight: '700',
    fontStyle: 'italic',
    color: C.green,
    lineHeight: 34,
  },
  heroP: {
    fontSize: 14,
    color: C.textM,
    textAlign: 'center',
    maxWidth: 460,
    lineHeight: 24,
    marginBottom: 28,
  },
  heroBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: C.green,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: C.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.beigeD,
    width: '65%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: C.brownBtn,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
  section: {
    paddingVertical: 24,
    paddingHorizontal: 21,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  secTitle: {
    fontFamily: serif,
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    marginBottom: 6,
  },
  secSub: {
    fontSize: 13,
    color: C.textL,
    marginBottom: 22,
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stepCard: {
    minWidth: 160,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.beigeD,
    borderRadius: 14,
    padding: 18,
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
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },
  stepNumText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 6,
  },
  stepBody: {
    fontSize: 12,
    color: C.textM,
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
  bottomSpacer: {
    height: 24,
  },
});

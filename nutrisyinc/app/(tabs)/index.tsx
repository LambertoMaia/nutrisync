import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopNav } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Routes } from '@/constants/routes';
import { FontFamily, NutrilhoColors, Spacing } from '@/constants/theme';

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
        <TopNav
          right={
            <>
              <Button title="Entrar" variant="ghost" onPress={() => tap(() => router.push(Routes.login))} />
              <Button
                title="Cadastrar"
                variant="green"
                onPress={() => tap(() => router.push(Routes.register))}
              />
            </>
          }
        />
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
          <View style={styles.heroPWrap}>
            <Text style={styles.heroP}>
              Envie o plano do seu nutricionista e cozinheiros parceiros montam suas marmitas exatamente como
              prescrito. Sem improvisar. Sem furar a dieta.
            </Text>
          </View>
          <View style={styles.heroCtaWrap}>
            <Button
              title="Quero pedir minhas marmitas"
              variant="primary"
              onPress={() => tap(() => router.push(Routes.register))}
              style={styles.heroCtaBtn}
              textStyle={styles.heroCtaBtnText}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.secTitle}>Como funciona</Text>
          <Text style={styles.secSub}>Do consultório à sua mesa em 4 passos</Text>
          <View style={styles.stepsGrid}>
            {steps.map((s) => (
              <Card key={s.num} style={[styles.stepCard, stepCardWidthStyle]}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{s.num}</Text>
                </View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepBody}>{s.body}</Text>
              </Card>
            ))}
          </View>
        </View>
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
});

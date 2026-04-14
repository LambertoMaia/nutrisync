import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo-mark';
import { TopNav } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { LabeledInput } from '@/components/ui/labeled-input';
import { Routes } from '@/constants/routes';
import { FontFamily, NutrilhoColors, Radii, Spacing } from '@/constants/theme';
import { isValidEmail } from '@/lib/validation';

const SUPPORT_EMAIL = 'suporte@nutrilho.app';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');

  function retornar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(Routes.login);
    }
  }

  function submit() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Recuperar senha', 'Informe o e-mail cadastrado.');
      return;
    }
    if (!isValidEmail(trimmed)) {
      Alert.alert('Recuperar senha', 'E-mail inválido.');
      return;
    }
    Alert.alert(
      'Recuperar senha',
      'Se encontrarmos uma conta com este e-mail, você receberá instruções para redefinir a senha.',
      [{ text: 'OK' }],
    );
  }

  function contactSupport() {
    const subject = encodeURIComponent('Ajuda — recuperação de conta Nutrilho');
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {
      Alert.alert(
        'Suporte',
        `Envie um e-mail para ${SUPPORT_EMAIL} explicando o problema com sua conta.`,
      );
    });
  }

  return (
    <View style={styles.root}>
      <View style={[styles.headerSafe, { paddingTop: Math.max(insets.top, 10) }]}>
        <TopNav
          left={<LogoMark onPress={() => router.replace(Routes.tabs)} />}
          right={<Button title="Retornar" variant="ghost" onPress={retornar} />}
        />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          style={styles.scroll}>
          <Text style={styles.formTitle}>Recuperar senha</Text>
          <Text style={styles.formSub}>
            Digite o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
          </Text>

          <LabeledInput
            label="E-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
          />

          <Button title="Enviar instruções" variant="primary" onPress={submit} style={styles.btnFull} />

          <View style={styles.supportBox}>
            <Text style={styles.supportTitle}>Ainda com dificuldades?</Text>
            <Text style={styles.supportBody}>
              Se você não recebe o e-mail ou não lembra qual endereço usou, nossa equipe pode ajudar.
            </Text>
            <Pressable accessibilityRole="button" onPress={contactSupport} style={styles.supportBtn}>
              <Text style={styles.supportLink}>Falar com o suporte</Text>
            </Pressable>
          </View>

          <Text style={styles.footerLine}>
            Lembrou da senha?{' '}
            <Text style={styles.linkInline} onPress={() => router.replace(Routes.login)}>
              Voltar ao login
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NutrilhoColors.beige },
  flex: { flex: 1 },
  headerSafe: {
    backgroundColor: NutrilhoColors.white,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.sectionPadX,
    paddingTop: 28,
    paddingBottom: 40,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  formTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 22,
    fontWeight: '700',
    color: NutrilhoColors.text,
    marginBottom: 6,
  },
  formSub: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textL,
    marginBottom: 22,
    lineHeight: 20,
  },
  btnFull: {
    width: '100%',
    paddingVertical: 13,
    marginTop: 4,
  },
  supportBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: NutrilhoColors.beigeMid,
    backgroundColor: NutrilhoColors.white,
  },
  supportTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: NutrilhoColors.text,
    marginBottom: 8,
  },
  supportBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textM,
    lineHeight: 20,
    marginBottom: 12,
  },
  supportBtn: {
    alignSelf: 'flex-start',
  },
  supportLink: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: NutrilhoColors.green,
  },
  footerLine: {
    textAlign: 'center',
    marginTop: 22,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textL,
  },
  linkInline: {
    fontFamily: FontFamily.sansMedium,
    color: NutrilhoColors.green,
  },
});

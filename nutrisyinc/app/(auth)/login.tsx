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
import { useAuth } from '@/contexts/auth-context';
import { FontFamily, NutrilhoColors, Radii, Spacing } from '@/constants/theme';
import { validateLogin } from '@/lib/validation';
import type { UserRole } from '@/types/models';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const [role, setRole] = useState<UserRole>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function retornar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(Routes.tabs);
    }
  }

  function submit() {
    const err = validateLogin({ email, password });
    if (err) {
      Alert.alert('Não foi possível entrar', err);
      return;
    }
    signIn(role, { email: email.trim(), displayName: email.trim().split('@')[0] });
    router.replace(Routes.tabs);
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
          <Text style={styles.formTitle}>Bem-vindo de volta</Text>
          <Text style={styles.formSub}>Acesse sua conta Nutrilho</Text>

          <View style={styles.roleRow}>
            <Pressable
              onPress={() => setRole('client')}
              style={[
                styles.roleBtn,
                role === 'client' ? styles.roleBtnOn : styles.roleBtnOff,
              ]}>
              <Text style={[styles.roleBtnText, role === 'client' && styles.roleBtnTextOn]}>Cliente</Text>
            </Pressable>
            <Pressable
              onPress={() => setRole('cook')}
              style={[
                styles.roleBtn,
                role === 'cook' ? styles.roleBtnOn : styles.roleBtnOff,
              ]}>
              <Text style={[styles.roleBtnText, role === 'cook' && styles.roleBtnTextOn]}>Cozinheiro</Text>
            </Pressable>
          </View>

          <LabeledInput
            label="E-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
          />
          <LabeledInput
            label="Senha"
            secureTextEntry
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={styles.forgotWrap} onPress={() => router.push(Routes.forgotPassword)}>
            <Text style={styles.link}>Esqueceu a senha?</Text>
          </Pressable>

          <Button title="Entrar" variant="primary" onPress={submit} style={styles.btnFull} />

          <Text style={styles.footerLine}>
            Não tem conta?{' '}
            <Text style={styles.linkInline} onPress={() => router.push(Routes.register)}>
              Cadastrar
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
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  roleBtnOn: {
    borderColor: NutrilhoColors.green,
    backgroundColor: NutrilhoColors.greenL,
  },
  roleBtnOff: {
    borderColor: NutrilhoColors.beigeMid,
    backgroundColor: NutrilhoColors.white,
  },
  roleBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: NutrilhoColors.textM,
  },
  roleBtnTextOn: {
    fontFamily: FontFamily.sansSemiBold,
    color: NutrilhoColors.greenD,
  },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 18 },
  link: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: NutrilhoColors.green,
  },
  btnFull: {
    width: '100%',
    paddingVertical: 13,
  },
  footerLine: {
    textAlign: 'center',
    marginTop: 14,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textL,
  },
  linkInline: {
    fontFamily: FontFamily.sansMedium,
    color: NutrilhoColors.green,
  },
});

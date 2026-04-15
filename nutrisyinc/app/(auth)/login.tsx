<<<<<<< Updated upstream
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
=======
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
>>>>>>> Stashed changes
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
<<<<<<< Updated upstream
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
=======
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/prototype/LogoMark';
import { FormField } from '@/components/prototype/FormField';
import { PasswordField } from '@/components/register/PasswordField';
import { fontSerif, P, radius } from '@/constants/prototypeTheme';
import { useAuth } from '@/contexts/AuthContext';
import { loginApi } from '@/lib/api';

type Role = 'cliente' | 'cozinheiro';

export default function LoginScreen() {
  const router = useRouter();
  const { setUserFromSession } = useAuth();
  const [role, setRole] = useState<Role>('cliente');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goHome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)');
  }, [router]);

  const tap = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  const submitLogin = useCallback(async () => {
    const e = email.trim();
    if (!e) {
      Alert.alert('Login', 'Informe seu e-mail.');
      return;
    }
    if (!senha) {
      Alert.alert('Login', 'Informe sua senha.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await loginApi({ email: e, senha, tipo: role });
      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await setUserFromSession(result.data);
        const tipo = result.data.usuario_tipo === 'cozinheiro' ? 'cozinheiro' : 'cliente';
        if (tipo === 'cliente') {
          router.replace('/home');
        } else {
          router.replace('/(tabs)');
        }
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login', result.error);
    } finally {
      setSubmitting(false);
    }
  }, [email, senha, role, router, setUserFromSession]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}>
        <View style={styles.topnav}>
          <LogoMark onPress={goHome} />
          <Pressable
            onPress={() => tap(() => router.replace('/(tabs)'))}
            style={({ pressed }) => [styles.retornarBtn, pressed && styles.pressed]}
            hitSlop={8}>
            <Text style={styles.retornarText}>Retornar ←</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}>
          <View style={styles.formWrap}>
            <Text style={styles.formTitle}>Bem-vindo de volta</Text>
            <Text style={styles.formSub}>Acesse sua conta Nutrilho</Text>

            <View style={styles.roleRow}>
              <Pressable
                onPress={() => tap(() => setRole('cliente'))}
                style={[styles.roleBtn, role === 'cliente' && styles.roleBtnOn]}>
                <Text style={[styles.roleBtnText, role === 'cliente' && styles.roleBtnTextOn]}>Cliente</Text>
              </Pressable>
              <Pressable
                onPress={() => tap(() => setRole('cozinheiro'))}
                style={[styles.roleBtn, role === 'cozinheiro' && styles.roleBtnOn]}>
                <Text style={[styles.roleBtnText, role === 'cozinheiro' && styles.roleBtnTextOn]}>Cozinheiro</Text>
              </Pressable>
            </View>

            <FormField
              label="E-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
            />
            <PasswordField label="Senha" placeholder="••••••••" value={senha} onChangeText={setSenha} />

            <Pressable style={styles.forgotWrap}>
              <Text style={styles.linkSmall}>Esqueceu a senha?</Text>
            </Pressable>

            <Pressable
              onPress={submitLogin}
              disabled={submitting}
              style={({ pressed }) => [
                styles.btnPrimary,
                pressed && styles.pressed,
                submitting && styles.btnDisabled,
              ]}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Entrar</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerMuted}>Não tem conta? </Text>
              <Pressable onPress={() => tap(() => router.push('/register'))}>
                <Text style={styles.link}>Cadastrar</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
>>>>>>> Stashed changes
  );
}

const styles = StyleSheet.create({
<<<<<<< Updated upstream
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
=======
  safe: {
    flex: 1,
    backgroundColor: P.beige,
  },
  flex: {
    flex: 1,
  },
  topnav: {
    backgroundColor: P.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.beigeD,
    paddingHorizontal: 19,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  retornarBtn: {
    paddingVertical: 6,
    paddingLeft: 8,
  },
  retornarText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.green,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 28,
    paddingHorizontal: 21,
    justifyContent: 'center',
  },
  formWrap: {
>>>>>>> Stashed changes
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  formTitle: {
<<<<<<< Updated upstream
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
=======
    fontFamily: fontSerif,
    fontSize: 22,
    fontWeight: '700',
    color: P.text,
    marginBottom: 6,
  },
  formSub: {
    fontSize: 13,
    color: P.textL,
>>>>>>> Stashed changes
    marginBottom: 22,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
<<<<<<< Updated upstream
    marginBottom: 22,
=======
    marginBottom: 20,
>>>>>>> Stashed changes
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 9,
<<<<<<< Updated upstream
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
=======
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    backgroundColor: P.white,
    alignItems: 'center',
  },
  roleBtnOn: {
    borderColor: P.green,
    backgroundColor: P.greenL,
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: P.textM,
  },
  roleBtnTextOn: {
    fontWeight: '600',
    color: P.greenD,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 14,
  },
  linkSmall: {
    fontSize: 12,
    color: P.green,
    fontWeight: '500',
  },
  btnPrimary: {
    backgroundColor: P.green,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    shadowColor: P.green,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  footerMuted: {
    fontSize: 13,
    color: P.textL,
  },
  link: {
    fontSize: 13,
    color: P.green,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.9,
  },
  btnDisabled: {
    opacity: 0.7,
>>>>>>> Stashed changes
  },
});

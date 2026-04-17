import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
          router.replace('/(cook)/dashboard');
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
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  formTitle: {
    fontFamily: fontSerif,
    fontSize: 22,
    fontWeight: '700',
    color: P.text,
    marginBottom: 6,
  },
  formSub: {
    fontSize: 13,
    color: P.textL,
    marginBottom: 22,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 9,
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
  },
});

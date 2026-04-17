import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenScaffold } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { FontFamily, NutrilhoColors } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user?.tipo === 'cliente') {
      router.replace('/(user)/perfil');
    }
  }, [loading, user?.tipo, router]);

  if (loading) {
    return <View style={styles.redirectShell} />;
  }

  if (user?.tipo === 'cliente') {
    return (
      <View style={styles.redirectShell}>
        <Text style={styles.body}>A abrir perfil…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <ScreenScaffold title="Perfil" subtitle="Entre para ver e editar seus dados.">
        <View style={styles.stack}>
          <Text style={styles.body}>Nenhuma sessão ativa.</Text>
          <Button title="Entrar" variant="primary" onPress={() => router.push(Routes.login)} />
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Perfil" subtitle="Dados da conta e preferências.">
      <View style={styles.stack}>
        <Text style={styles.label}>Nome</Text>
        <Text style={styles.value}>{user.nome}</Text>
        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.value}>{user.email}</Text>
        <Text style={styles.label}>Perfil</Text>
        <Text style={styles.value}>Cozinheiro</Text>
        <Button
          title="Sair"
          variant="secondary"
          onPress={async () => {
            await logout();
            router.replace(Routes.tabs);
          }}
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  redirectShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NutrilhoColors.cream,
  },
  stack: {
    gap: 10,
  },
  label: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    color: NutrilhoColors.textM,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  value: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: NutrilhoColors.text,
  },
  body: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NutrilhoColors.textM,
    lineHeight: 22,
    marginBottom: 4,
  },
});

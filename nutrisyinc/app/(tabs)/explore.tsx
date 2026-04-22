import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ScreenScaffold } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { FontFamily, NutrilhoColors } from '@/constants/theme';

export default function ExploreScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user?.tipo === 'cliente') {
      router.replace(Routes.marketplace);
    }
  }, [loading, user?.tipo, router]);

  if (loading || user?.tipo === 'cliente') {
    return (
      <View style={styles.redirectShell}>
        <ActivityIndicator color={NutrilhoColors.green} />
      </View>
    );
  }

  return (
    <ScreenScaffold
      title="Marketplace"
      subtitle="Entre como cliente para ver os cozinheiros disponíveis.">
      <View style={styles.stack}>
        <Text style={styles.body}>
          Esta aba é destinada à busca de cozinheiros por clientes. Cozinheiros
          devem acessar o painel pelo menu principal.
        </Text>
        {!user ? (
          <Button title="Entrar" variant="primary" onPress={() => router.push(Routes.login)} />
        ) : null}
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
  stack: { gap: 12 },
  body: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NutrilhoColors.textM,
    lineHeight: 22,
  },
});

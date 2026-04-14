import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenScaffold } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Routes } from '@/constants/routes';
import { FontFamily, NutrilhoColors } from '@/constants/theme';

export default function ExploreScreen() {
  const router = useRouter();

  return (
    <ScreenScaffold
      title="Explorar"
      subtitle="Atalho para o marketplace de cozinheiros. Na Fase 4, este fluxo será integrado ao marketplace.">
      <View style={styles.block}>
        <Text style={styles.body}>
          Use o botão abaixo para abrir a lista de cozinheiros (protótipo cozinheiros.html).
        </Text>
        <Button title="Ver cozinheiros" variant="primary" onPress={() => router.push(Routes.marketplace)} />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 16,
  },
  body: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NutrilhoColors.textM,
    lineHeight: 22,
    marginBottom: 4,
  },
});

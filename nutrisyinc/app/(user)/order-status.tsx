import { StyleSheet, Text } from 'react-native';

import { ScreenScaffold } from '@/components/layout';
import { FontFamily, NutrilhoColors } from '@/constants/theme';

export default function OrderStatusScreen() {
  return (
    <ScreenScaffold
      title="Status do pedido"
      subtitle="Acompanhe preparo e entrega."
      showBack>
      <Text style={styles.body}>Linha do tempo de status na Fase 4.</Text>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NutrilhoColors.textM,
    lineHeight: 22,
  },
});

import { StyleSheet, Text } from 'react-native';

import { ScreenScaffold } from '@/components/layout';
import { FontFamily, NutrilhoColors } from '@/constants/theme';

export default function ConfirmOrderScreen() {
  return (
    <ScreenScaffold
      title="Confirmar pedido"
      subtitle="Revise itens e endereço antes de enviar."
      showBack>
      <Text style={styles.body}>Detalhes do pedido na Fase 4.</Text>
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

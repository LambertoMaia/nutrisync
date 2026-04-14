import { Pressable, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';

import { FontFamily, NutrilhoColors, Radii } from '@/constants/theme';
import type { Pedido, PedidoStatus } from '@/types/models';

export type PedidoCardProps = {
  pedido: Pedido;
  /** Cook view: show accept / reject */
  showActions?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
};

function badgeForStatus(status: PedidoStatus): {
  label: string;
  wrap: ViewStyle;
  text: TextStyle;
} {
  switch (status) {
    case 'new':
      return { label: 'Novo', wrap: styles.badgeNew, text: styles.badgeTextNew };
    case 'prep':
      return { label: 'Em preparo', wrap: styles.badgePrep, text: styles.badgeTextPrep };
    case 'done':
      return { label: 'Entregue', wrap: styles.badgeDone, text: styles.badgeTextDone };
    default:
      return { label: '', wrap: {}, text: {} };
  }
}

export function PedidoCard({ pedido, showActions, onAccept, onReject }: PedidoCardProps) {
  const b = badgeForStatus(pedido.status);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pedidoId}>Pedido {pedido.id}</Text>
          <Text style={styles.userName}>{pedido.userName}</Text>
        </View>
        <View style={[styles.pbadge, b.wrap]}>
          <Text style={[styles.pbadgeText, b.text]}>{b.label}</Text>
        </View>
      </View>
      <Text style={styles.info}>{pedido.info}</Text>
      {pedido.receitaBody ? (
        <View style={styles.receitaBox}>
          {pedido.receitaLabel ? <Text style={styles.receitaLbl}>{pedido.receitaLabel}</Text> : null}
          <Text style={styles.receitaBody}>{pedido.receitaBody}</Text>
        </View>
      ) : null}
      {showActions ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onAccept}
            style={({ pressed }) => [styles.btnAccept, pressed && styles.pressed]}>
            <Text style={styles.btnAcceptText}>Aceitar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onReject}
            style={({ pressed }) => [styles.btnReject, pressed && styles.pressed]}>
            <Text style={styles.btnRejectText}>Recusar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NutrilhoColors.white,
    borderWidth: 1,
    borderColor: NutrilhoColors.beigeD,
    borderRadius: Radii.lg,
    padding: 18,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pedidoId: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: NutrilhoColors.textL,
  },
  userName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: NutrilhoColors.text,
  },
  pbadge: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 20,
  },
  pbadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
  },
  badgeTextNew: {
    color: NutrilhoColors.pbadgeNewText,
  },
  badgeTextPrep: {
    color: NutrilhoColors.greenD,
  },
  badgeTextDone: {
    color: NutrilhoColors.pbadgeDoneText,
  },
  badgeNew: {
    backgroundColor: NutrilhoColors.pbadgeNewBg,
  },
  badgePrep: {
    backgroundColor: NutrilhoColors.greenL,
  },
  badgeDone: {
    backgroundColor: NutrilhoColors.pbadgeDoneBg,
  },
  info: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: NutrilhoColors.textM,
    lineHeight: 19,
    marginBottom: 10,
  },
  receitaBox: {
    backgroundColor: NutrilhoColors.beige,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: NutrilhoColors.green,
    marginBottom: 10,
  },
  receitaLbl: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9,
    color: NutrilhoColors.green,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  receitaBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: NutrilhoColors.textM,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 4,
  },
  btnAccept: {
    flex: 1,
    backgroundColor: NutrilhoColors.green,
    paddingVertical: 9,
    borderRadius: Radii.sm,
    alignItems: 'center',
  },
  btnAcceptText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: NutrilhoColors.white,
  },
  btnReject: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 9,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    borderColor: NutrilhoColors.beigeMid,
    alignItems: 'center',
  },
  btnRejectText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: NutrilhoColors.textM,
  },
  pressed: { opacity: 0.88 },
});

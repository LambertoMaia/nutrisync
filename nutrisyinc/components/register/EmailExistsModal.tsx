import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { P, radius } from '@/constants/prototypeTheme';

type Props = {
  visible: boolean;
  message?: string;
  onDismiss: () => void;
  onGoLogin: () => void;
};

export function EmailExistsModal({ visible, message, onDismiss, onGoLogin }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>E-mail já cadastrado</Text>
          <Text style={styles.body}>
            {message?.trim() ||
              'Este e-mail já possui uma conta. Você pode entrar com ele ou usar outro e-mail.'}
          </Text>
          <View style={styles.row}>
            <Pressable onPress={onDismiss} style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}>
              <Text style={styles.btnGhostText}>Fechar</Text>
            </Pressable>
            <Pressable onPress={onGoLogin} style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}>
              <Text style={styles.btnPrimaryText}>Ir para login</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: P.white,
    borderRadius: radius.md,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.beigeD,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: P.text,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: P.textM,
    lineHeight: 21,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.textM,
  },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: P.green,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pressed: {
    opacity: 0.88,
  },
});

import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import type { TextInputProps } from 'react-native';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fontSerif, P, radius } from '@/constants/prototypeTheme';

export type AddressFormData = {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  numero: string;
  complemento: string;
};

type Props = {
  visible: boolean;
  initial: AddressFormData;
  onClose: () => void;
  onConfirm: (data: AddressFormData) => void;
  /** User wants to go back and change the CEP on the form. */
  onChangeCep: () => void;
};

export function AddressConfirmModal({ visible, initial, onClose, onConfirm, onChangeCep }: Props) {
  const [form, setForm] = useState<AddressFormData>(initial);
  const [numeroError, setNumeroError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setForm(initial);
    setNumeroError(false);
  }, [visible, initial]);

  const update = (key: keyof AddressFormData, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'numero') setNumeroError(false);
  };

  const handleConfirm = () => {
    const n = form.numero.trim();
    if (!n) {
      setNumeroError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm({ ...form, numero: n });
  };

  const handleChangeCep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeCep();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Confirmar endereço</Text>
          <Text style={styles.sub}>
            Confira os dados do CEP. Você pode ajustar antes de salvar e editar depois no cadastro.
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Field label="Logradouro" value={form.logradouro} onChangeText={(t) => update('logradouro', t)} />
            <Field label="Bairro" value={form.bairro} onChangeText={(t) => update('bairro', t)} />
            <Field label="Localidade" value={form.localidade} onChangeText={(t) => update('localidade', t)} />
            <Field
              label="UF"
              value={form.uf}
              onChangeText={(t) => update('uf', t.toUpperCase().slice(0, 2))}
              maxLength={2}
              autoCapitalize="characters"
            />
            <Field
              label="Número"
              value={form.numero}
              onChangeText={(t) => update('numero', t)}
              required
              error={numeroError}
            />
            <Field
              label="Complemento (opcional)"
              value={form.complemento}
              onChangeText={(t) => update('complemento', t)}
            />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={handleChangeCep} style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}>
              <Text style={styles.btnGhostText}>Alterar CEP</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}>
              <Text style={styles.btnPrimaryText}>Salvar endereço</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  required,
  error,
  ...rest
}: {
  label: string;
  required?: boolean;
  error?: boolean;
} & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={P.textL}
        style={[styles.input, error && styles.inputErr]}
        {...rest}
      />
      {error ? <Text style={styles.errText}>Informe o número.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 20,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: P.white,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: P.beigeD,
  },
  title: {
    fontFamily: fontSerif,
    fontSize: 20,
    fontWeight: '700',
    color: P.text,
    marginBottom: 6,
  },
  sub: {
    fontSize: 12,
    color: P.textL,
    marginBottom: 14,
    lineHeight: 18,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: P.textM,
    marginBottom: 4,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  req: {
    color: P.errorText,
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    borderRadius: radius.md,
    fontSize: 14,
    color: P.text,
    backgroundColor: P.white,
  },
  inputErr: {
    borderColor: P.errorBorder,
  },
  errText: {
    fontSize: 11,
    color: P.errorText,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  btnGhost: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.textM,
  },
  btnPrimary: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: P.green,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pressed: {
    opacity: 0.9,
  },
});

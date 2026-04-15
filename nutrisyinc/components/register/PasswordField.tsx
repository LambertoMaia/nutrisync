import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { P, radius } from '@/constants/prototypeTheme';

type Props = {
  label: string;
} & TextInputProps;

export function PasswordField({ label, style, secureTextEntry: _st, ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          placeholderTextColor={P.textL}
          style={[styles.input, style]}
          secureTextEntry={!visible}
          {...rest}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.eye}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}>
          <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={22} color={P.textM} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: P.textM,
    marginBottom: 6,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 13,
    paddingRight: 44,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    borderRadius: radius.md,
    fontSize: 14,
    backgroundColor: P.white,
    color: P.text,
  },
  eye: {
    position: 'absolute',
    right: 8,
    padding: 4,
  },
});

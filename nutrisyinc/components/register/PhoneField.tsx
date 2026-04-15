import { StyleSheet, Text, TextInput, View } from 'react-native';

import { P, radius } from '@/constants/prototypeTheme';
import { maskPhoneBR } from '@/lib/masks';

type Props = {
  label: string;
  value: string;
  onChangeDigits: (digits: string) => void;
  placeholder?: string;
};

/**
 * Brazilian mobile/landline mask; only digits stored via `onChangeDigits` (max 11).
 */
export function PhoneField({ label, value, onChangeDigits, placeholder = '(00) 00000-0000' }: Props) {
  const display = maskPhoneBR(value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={P.textL}
        keyboardType="number-pad"
        inputMode="numeric"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={16}
        value={display}
        onChangeText={(t) => {
          const d = t.replace(/\D/g, '').slice(0, 11);
          onChangeDigits(d);
        }}
        style={styles.input}
      />
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
  input: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    borderRadius: radius.md,
    fontSize: 14,
    backgroundColor: P.white,
    color: P.text,
  },
});

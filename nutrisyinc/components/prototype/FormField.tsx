import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { P, radius } from '@/constants/prototypeTheme';

type Props = {
  label: string;
  /** Shows a red asterisk after the label (required fields). */
  required?: boolean;
} & TextInputProps;

export function FormField({ label, required, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required ? <Text style={styles.requiredStar}>*</Text> : null}
      </View>
      <TextInput
        placeholderTextColor={P.textL}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: P.textM,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  requiredStar: {
    fontSize: 14,
    fontWeight: '700',
    color: P.errorText,
    lineHeight: 16,
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

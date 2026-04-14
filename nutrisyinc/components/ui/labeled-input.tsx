import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { FontFamily, NutrilhoColors, Radii } from '@/constants/theme';

export type LabeledInputProps = TextInputProps & {
  label: string;
};

export function LabeledInput({ label, style, secureTextEntry, ...rest }: LabeledInputProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const showPasswordToggle = !!secureTextEntry;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {showPasswordToggle ? (
        <View style={styles.inputRow}>
          <TextInput
            placeholderTextColor={NutrilhoColors.textL}
            style={[styles.input, styles.inputInRow, style]}
            secureTextEntry={!passwordVisible}
            {...rest}
          />
          <Pressable
            accessibilityLabel={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setPasswordVisible((v) => !v)}
            style={styles.toggleBtn}>
            <Ionicons
              color={NutrilhoColors.textM}
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
            />
          </Pressable>
        </View>
      ) : (
        <TextInput
          placeholderTextColor={NutrilhoColors.textL}
          style={[styles.input, style]}
          {...rest}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: NutrilhoColors.textM,
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: NutrilhoColors.beigeMid,
    borderRadius: Radii.md,
    backgroundColor: NutrilhoColors.white,
    color: NutrilhoColors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: NutrilhoColors.beigeMid,
    borderRadius: Radii.md,
    backgroundColor: NutrilhoColors.white,
    paddingRight: 4,
  },
  inputInRow: {
    flex: 1,
    borderWidth: 0,
    paddingRight: 4,
    minWidth: 0,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

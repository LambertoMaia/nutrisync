import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FontFamily, NutrilhoColors, Radii } from '@/constants/theme';

export type SelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

export function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        <Text style={styles.triggerText}>{value}</Text>
        <Text style={styles.chev}>▼</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdropFill} onPress={() => setOpen(false)} />
          <View style={styles.sheetWrap}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}>
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: NutrilhoColors.textM,
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: NutrilhoColors.beigeMid,
    borderRadius: Radii.md,
    backgroundColor: NutrilhoColors.white,
  },
  pressed: { opacity: 0.92 },
  triggerText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NutrilhoColors.text,
    flex: 1,
  },
  chev: { fontSize: 10, color: NutrilhoColors.textL, marginLeft: 8 },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    zIndex: 1,
    backgroundColor: NutrilhoColors.white,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: 16,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 17,
    fontWeight: '700',
    color: NutrilhoColors.text,
    marginBottom: 12,
  },
  option: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NutrilhoColors.beigeD,
  },
  optionPressed: { backgroundColor: NutrilhoColors.beige },
  optionText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: NutrilhoColors.text,
  },
  cancel: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: NutrilhoColors.green,
  },
});

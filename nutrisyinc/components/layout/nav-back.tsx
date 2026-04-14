import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { NutrilhoColors } from '@/constants/theme';

export type NavBackButtonProps = {
  /** @default "Voltar" */
  label?: string;
};

export function NavBackButton({ label = 'Voltar' }: NavBackButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      onPress={() => router.back()}
      style={styles.row}>
      <Ionicons name="chevron-back" size={22} color={NutrilhoColors.green} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
});

import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, NutrilhoColors } from '@/constants/theme';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketplace</Text>
      <Text style={styles.sub}>Em breve — lista de cozinheiros e marmitas.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NutrilhoColors.cream,
  },
  title: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 20,
    color: NutrilhoColors.text,
    marginBottom: 8,
  },
  sub: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NutrilhoColors.textM,
    textAlign: 'center',
    lineHeight: 22,
  },
});

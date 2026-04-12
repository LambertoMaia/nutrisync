import * as SplashScreen from 'expo-splash-screen';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

const SPLASH_MS = 2500;

const C = {
  green: '#4a7c2f',
  greenD: '#2e5a18',
  cream: '#faf7f2',
  textL: '#8a7a65',
};

const serif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export default function SplashRoute() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await SplashScreen.hideAsync();
      await new Promise<void>((resolve) => setTimeout(resolve, SPLASH_MS));
      if (!cancelled) {
        router.replace('/(tabs)');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={styles.root}>
      <View style={styles.logoIcon}>
        <Text style={styles.logoGlyph}>🌿</Text>
      </View>
      <Text style={styles.name}>NutriSync</Text>
      <Text style={styles.tag}>sua receita, nossa marmita</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  logoGlyph: {
    fontSize: 44,
  },
  name: {
    fontFamily: serif,
    fontSize: 32,
    fontWeight: '700',
    color: C.greenD,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tag: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textL,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

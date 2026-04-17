<<<<<<< Updated upstream
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
=======
import 'react-native-gesture-handler';
>>>>>>> Stashed changes
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

<<<<<<< Updated upstream
import { AuthProvider } from '@/contexts/auth-context';
=======
import { AuthProvider } from '@/contexts/AuthContext';
>>>>>>> Stashed changes
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
<<<<<<< Updated upstream
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(user)" />
          <Stack.Screen name="(cook)" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
=======
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{
            contentStyle: { backgroundColor: '#faf7f2' },
            animation: 'fade',
          }}
        />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade', contentStyle: { backgroundColor: '#faf7f2' } }} />
        <Stack.Screen name="(user)" options={{ animation: 'fade', contentStyle: { backgroundColor: '#faf7f2' } }} />
        <Stack.Screen name="(auth)" />
      </Stack>
      <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
>>>>>>> Stashed changes
  );
}

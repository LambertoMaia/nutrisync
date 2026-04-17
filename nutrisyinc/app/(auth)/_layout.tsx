import { Stack } from 'expo-router';

/** Prototype screens include their own `topnav` (see `web-prototype/login.html`, `cadastro.html`). */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

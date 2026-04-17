import { Stack } from 'expo-router';

export default function UserGroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#faf7f2' },
        animation: 'fade',
      }}
    />
  );
}

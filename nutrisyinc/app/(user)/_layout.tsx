import { Stack } from 'expo-router';

<<<<<<< Updated upstream
export default function UserFlowLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
=======
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
>>>>>>> Stashed changes
}

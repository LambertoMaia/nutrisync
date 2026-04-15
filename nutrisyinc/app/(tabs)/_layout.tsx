import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
<<<<<<< Updated upstream
      <Tabs.Screen name="explore" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="orders" options={{ title: 'Pedidos' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
=======
      <Tabs.Screen name="explore" options={{ title: 'Marketplace' }} />
>>>>>>> Stashed changes
    </Tabs>
  );
}

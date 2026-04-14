import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/layout';
import { PedidoCard } from '@/components/ui/pedido-card';
import { Routes } from '@/constants/routes';
import { useAuth } from '@/contexts/auth-context';
import { fetchPedidos } from '@/lib/api';
import type { Pedido } from '@/types/models';

export default function CookDashboardScreen() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPedidos();
      setPedidos(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return <Redirect href={Routes.login} />;
  }
  if (user.role !== 'cook') {
    return <Redirect href={Routes.tabs} />;
  }

  return (
    <ScreenScaffold
      title="Painel do cozinheiro"
      subtitle="Pedidos mock — ações Aceitar/Recusar sem backend ainda."
      showBack>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4a7c2f" />
        </View>
      ) : (
        pedidos.map((item) => (
          <PedidoCard
            key={item.id}
            pedido={item}
            showActions={item.status === 'new'}
            onAccept={() => {}}
            onReject={() => {}}
          />
        ))
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});

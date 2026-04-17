import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ScreenScaffold } from '@/components/layout';
import { PedidoCard } from '@/components/ui/pedido-card';
import { mockPedidos } from '@/data/mocks/pedidos';
import { useAuth } from '@/contexts/AuthContext';
import { Routes } from '@/constants/routes';
import type { Pedido } from '@/types/models';

export default function CookDashboardScreen() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 80));
      setPedidos([...mockPedidos]);
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
  if (user.tipo !== 'cozinheiro') {
    return <Redirect href={Routes.tabs} />;
  }

  return (
    <ScreenScaffold
      title="Painel do cozinheiro"
      subtitle="Pedidos de demonstração — integração com API em breve."
      showBack>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4a7c2f" />
        </View>
      ) : pedidos.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>Nenhum pedido no momento.</Text>
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
  empty: {
    fontSize: 14,
    color: '#5a4e3a',
  },
});

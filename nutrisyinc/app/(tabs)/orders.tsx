import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/layout';
import { PedidoCard } from '@/components/ui/pedido-card';
import { fetchPedidos } from '@/lib/api';
import type { Pedido } from '@/types/models';

export default function OrdersScreen() {
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

  return (
    <ScreenScaffold title="Meus pedidos" subtitle="Lista mock — API depois.">
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4a7c2f" />
        </View>
      ) : (
        pedidos.map((p) => <PedidoCard key={p.id} pedido={p} />)
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

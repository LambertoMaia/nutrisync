import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/layout';
import { CookCard } from '@/components/ui/cook-card';
import { fetchCooks } from '@/lib/api';
import type { Cook } from '@/types/models';

export default function MarketplaceScreen() {
  const [cooks, setCooks] = useState<Cook[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCooks();
      setCooks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenScaffold
      title="Cozinheiros"
      subtitle="Dados mock via lib/api — substituir por API na integração."
      showBack>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4a7c2f" />
        </View>
      ) : (
        cooks.map((c) => <CookCard key={c.id} cook={c} />)
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

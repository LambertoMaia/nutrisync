import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoIcon } from '@/components/prototype/LogoIcon';
import { SolicitacaoCard } from '@/components/prototype/SolicitacaoCard';
import { Routes } from '@/constants/routes';
import { fontSerif, logoSize, P, radius } from '@/constants/prototypeTheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchSolicitacoesAbertasApi,
  type SolicitacaoAbertaJson,
} from '@/lib/api';

const PAGE_SIZE = 20;

const FILTRO_CHIPS: { id: string; label: string; q: string }[] = [
  { id: 'lactose', label: 'Sem lactose', q: 'lactose' },
  { id: 'gluten', label: 'Sem glúten', q: 'glúten' },
  { id: 'lowcarb', label: 'Low carb', q: 'low carb' },
  { id: 'hipertrofia', label: 'Hipertrofia', q: 'hipertrofia' },
  { id: 'emagrec', label: 'Emagrecimento', q: 'emagrec' },
];

export default function CookSolicitacoesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [items, setItems] = useState<SolicitacaoAbertaJson[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveQ = useMemo(() => {
    const chip = FILTRO_CHIPS.find((c) => c.id === activeChip);
    return chip ? chip.q : query;
  }, [activeChip, query]);

  const load = useCallback(
    async (opts: { reset?: boolean; append?: boolean } = {}) => {
      const { reset = true, append = false } = opts;
      if (user?.tipo !== 'cozinheiro') return;
      if (append) setLoadingMore(true);
      else setRefreshing(true);
      setErr(null);

      const nextOffset = append ? offset + PAGE_SIZE : 0;
      const res = await fetchSolicitacoesAbertasApi({
        q: effectiveQ || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
        somenteSemPropostaMinha: true,
      });

      if (res.ok) {
        setTotal(res.total);
        setOffset(res.offset);
        setItems((prev) =>
          append ? [...prev, ...res.solicitacoes] : res.solicitacoes,
        );
      } else {
        setErr(res.error);
        if (reset) setItems([]);
      }

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [user?.tipo, effectiveQ, offset],
  );

  useFocusEffect(
    useCallback(() => {
      load({ reset: true });
    }, [load]),
  );

  const onChangeQuery = useCallback((text: string) => {
    setQuery(text);
    setActiveChip(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load({ reset: true });
    }, 300);
  }, [load]);

  const onPressChip = useCallback(
    (id: string) => {
      setActiveChip((prev) => (prev === id ? null : id));
      setQuery('');
      Keyboard.dismiss();
      setTimeout(() => load({ reset: true }), 0);
    },
    [load],
  );

  const canLoadMore = items.length < total;
  const onEndReached = useCallback(() => {
    if (loadingMore || refreshing || loading) return;
    if (!canLoadMore) return;
    load({ append: true });
  }, [canLoadMore, load, loading, loadingMore, refreshing]);

  if (!user) return <Redirect href={Routes.login} />;
  if (user.tipo !== 'cozinheiro') return <Redirect href={Routes.tabs} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topnav}>
        <Pressable
          onPress={() => router.replace(Routes.cookDashboard)}
          hitSlop={8}
          style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={P.text} />
        </Pressable>
        <View style={styles.topCenter}>
          <LogoIcon size={logoSize.nav} />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>Solicitações abertas</Text>
            <Text style={styles.brandTag}>
              {total > 0 ? `${total} disponíveis` : 'descoberta de clientes'}
            </Text>
          </View>
        </View>
        <View style={styles.topRightSpacer} />
      </View>

      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={18} color={P.textL} />
        <TextInput
          placeholder="Buscar por restrição, plano, objetivo…"
          placeholderTextColor={P.textL}
          value={query}
          onChangeText={onChangeQuery}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => load({ reset: true })}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => onChangeQuery('')} hitSlop={8}>
            <MaterialIcons name="close" size={18} color={P.textL} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}>
        {FILTRO_CHIPS.map((c) => {
          const active = activeChip === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onPressChip(c.id)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={P.green} size="large" />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => (
            <SolicitacaoCard
              solicitacao={item}
              onPress={() => router.push(Routes.cookSolicitacaoDetalhe(item.id))}
            />
          )}
          ListHeaderComponent={
            err ? (
              <View style={styles.bannerErr}>
                <Text style={styles.bannerErrText}>{err}</Text>
                <Pressable onPress={() => load({ reset: true })} style={styles.bannerRetry}>
                  <Text style={styles.bannerRetryText}>Tentar de novo</Text>
                </Pressable>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !err ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="restaurant-menu" size={40} color={P.textL} />
                <Text style={styles.emptyTitle}>Nada por aqui</Text>
                <Text style={styles.emptyBody}>
                  Nenhuma solicitação disponível agora.{'\n'}Puxe para atualizar.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={P.green} />
              </View>
            ) : null
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ reset: true })}
              tintColor={P.green}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.beige },
  topnav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: P.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.beigeD,
    gap: 10,
  },
  backBtn: { padding: 4 },
  topCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  topRightSpacer: { width: 30 },
  brandText: { justifyContent: 'center', flex: 1 },
  brandName: { fontFamily: fontSerif, fontSize: 16, fontWeight: '700', color: P.text },
  brandTag: { fontSize: 11, color: P.textL, marginTop: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: P.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.beigeD,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: P.text,
    paddingVertical: 2,
  },
  chipsScroll: {
    flexGrow: 0,
    marginTop: 10,
    marginBottom: 4,
  },
  chipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.beigeMid,
    backgroundColor: P.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: P.green,
    borderColor: P.green,
  },
  chipText: {
    fontSize: 12,
    color: P.textM,
    fontWeight: '500',
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chipTextActive: { color: '#fff' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerErr: {
    backgroundColor: P.errorBg,
    borderWidth: 1,
    borderColor: P.errorBorder,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  bannerErrText: { color: P.errorText, fontSize: 13, marginBottom: 8 },
  bannerRetry: { alignSelf: 'flex-start' },
  bannerRetryText: { color: P.greenD, fontWeight: '600', fontSize: 13 },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: { fontFamily: fontSerif, fontSize: 18, fontWeight: '700', color: P.text },
  emptyBody: { fontSize: 13, color: P.textL, textAlign: 'center', lineHeight: 20 },
  footerLoading: { paddingVertical: 16, alignItems: 'center' },
});

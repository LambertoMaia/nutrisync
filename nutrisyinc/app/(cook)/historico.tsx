/**
 * Cozinheiro — Histórico de pedidos (entregues + cancelados).
 *
 * Reutiliza `GET /api/pedidos/cozinheiro/<id>` (já usado no dashboard)
 * e filtra para status terminais (`entregue`, `cancelado`). Ver também
 * o "Pedidos ativos" no dashboard para a contrapartida em andamento.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Routes } from '@/constants/routes';
import { fontSerif, P, radius } from '@/constants/prototypeTheme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPedidosCozinheiroApi, type PedidoCozinheiroJson } from '@/lib/api';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const FINALIZADO = new Set(['entregue', 'cancelado']);

type Filter = 'todos' | 'entregue' | 'cancelado';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'entregue', label: 'Entregues' },
  { id: 'cancelado', label: 'Cancelados' },
];

function statusLabel(status: string): { bg: string; fg: string; text: string } {
  if (status === 'entregue') return { bg: P.greenL, fg: P.greenD, text: 'Entregue' };
  if (status === 'cancelado') return { bg: '#ffebee', fg: '#c62828', text: 'Cancelado' };
  return { bg: P.beigeD, fg: P.textM, text: status };
}

function Stars({ n }: { n: number }) {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  if (r <= 0) return null;
  return (
    <Text style={styles.stars}>
      {'★'.repeat(r)}
      {'☆'.repeat(5 - r)}
    </Text>
  );
}

export default function CookHistoricoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoCozinheiroJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('todos');

  const tap = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  const uid = user?.id;

  const load = useCallback(async () => {
    if (user?.tipo !== 'cozinheiro' || uid == null) return;
    setFetchErr(null);
    setRefreshing(true);
    const res = await fetchPedidosCozinheiroApi(uid);
    if (res.ok) {
      setPedidos(res.pedidos);
    } else {
      setFetchErr(res.error);
      setPedidos([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.tipo, uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const { lista, stats } = useMemo(() => {
    const finalizados = pedidos.filter((p) => FINALIZADO.has(p.status));
    const entregues = finalizados.filter((p) => p.status === 'entregue');
    const cancelados = finalizados.filter((p) => p.status === 'cancelado');
    const totalValor = entregues.reduce((s, p) => s + p.valor_total, 0);
    const rated = entregues.filter((p) => p.avaliacao > 0);
    const media =
      rated.length > 0 ? rated.reduce((s, p) => s + p.avaliacao, 0) / rated.length : null;
    const filtered =
      filter === 'todos'
        ? finalizados
        : filter === 'entregue'
          ? entregues
          : cancelados;
    return {
      lista: filtered,
      stats: {
        entregues: entregues.length,
        cancelados: cancelados.length,
        totalValor,
        mediaLabel: media != null ? `★${media.toFixed(1)}` : '—',
      },
    };
  }, [pedidos, filter]);

  if (!user) return <Redirect href={Routes.login} />;
  if (user.tipo !== 'cozinheiro') return <Redirect href={Routes.tabs} />;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topnav}>
          <Pressable
            onPress={() =>
              tap(() => {
                if (router.canGoBack()) router.back();
                else router.replace(Routes.cookDashboard);
              })
            }
            hitSlop={8}
            style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}>
            <Text style={styles.btnGhostText}>← Voltar</Text>
          </Pressable>
          <Text style={styles.topTitle}>Histórico</Text>
          <View style={styles.topSpacer} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={P.green} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
          {fetchErr ? (
            <View style={styles.bannerErr}>
              <Text style={styles.bannerErrText}>{fetchErr}</Text>
              <Pressable onPress={load} style={styles.bannerRetry}>
                <Text style={styles.bannerRetryText}>Tentar de novo</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: P.greenD }]}>{stats.entregues}</Text>
              <Text style={styles.statLbl}>Entregues</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: '#c62828' }]}>{stats.cancelados}</Text>
              <Text style={styles.statLbl}>Cancelados</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: P.brownBtn, fontSize: 15 }]}>
                {formatBrl(stats.totalValor)}
              </Text>
              <Text style={styles.statLbl}>Faturado</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: P.text }]}>{stats.mediaLabel}</Text>
              <Text style={styles.statLbl}>Avaliação</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}>
            {FILTERS.map((f) => {
              const active = f.id === filter;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => tap(() => setFilter(f.id))}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipOn,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.chipText, active && styles.chipTextOn]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {lista.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Sem histórico por aqui</Text>
              <Text style={styles.emptyHint}>
                {filter === 'todos'
                  ? 'Pedidos entregues e cancelados aparecerão aqui.'
                  : filter === 'entregue'
                    ? 'Nenhum pedido entregue ainda.'
                    : 'Nenhum pedido cancelado.'}
              </Text>
            </View>
          ) : (
            lista.map((p) => {
              const sl = statusLabel(p.status);
              return (
                <View key={p.id} style={styles.card}>
                  <View style={styles.cardHead}>
                    <View style={styles.cardHeadMain}>
                      <Text style={styles.cardId}>
                        Pedido #{String(p.id).padStart(4, '0')} · {p.data}
                      </Text>
                      <Text style={styles.cardUser}>{p.cliente_nome}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: sl.bg }]}>
                      <Text style={[styles.badgeText, { color: sl.fg }]}>{sl.text}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardInfo}>
                    {p.qtd_marmitas} marmitas · {formatBrl(p.valor_total)}
                  </Text>
                  {p.status === 'entregue' && p.avaliacao > 0 ? (
                    <View style={styles.ratingRow}>
                      <Stars n={p.avaliacao} />
                      <Text style={styles.ratingLabel}>
                        {p.avaliacao.toFixed(1)} de 5
                      </Text>
                    </View>
                  ) : p.status === 'entregue' ? (
                    <Text style={styles.ratingPending}>Cliente ainda não avaliou.</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomNav}>
          <Pressable
            style={styles.bnavBtn}
            onPress={() => tap(() => router.replace(Routes.cookDashboard))}>
            <MaterialIcons name="home" size={22} color={P.textL} />
            <Text style={styles.bnavLabel}>Pedidos</Text>
          </Pressable>
          <Pressable
            style={styles.bnavBtn}
            onPress={() => tap(() => router.push(Routes.cookSolicitacoes))}>
            <MaterialIcons name="inbox" size={22} color={P.textL} />
            <Text style={styles.bnavLabel}>Solicitações</Text>
          </Pressable>
          <View style={styles.bnavBtn}>
            <MaterialIcons name="event-note" size={22} color={P.green} />
            <Text style={[styles.bnavLabel, styles.bnavLabelOn]}>Histórico</Text>
          </View>
          <Pressable
            style={styles.bnavBtn}
            onPress={() => tap(() => router.push(Routes.cookPerfil))}>
            <MaterialIcons name="person-outline" size={22} color={P.textL} />
            <Text style={styles.bnavLabel}>Perfil</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.beige },
  safeTop: {
    backgroundColor: P.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.beigeD,
  },
  topnav: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnGhost: { paddingVertical: 8, paddingHorizontal: 10, minWidth: 72 },
  btnGhostText: { fontSize: 13, fontWeight: '500', color: P.textM },
  topTitle: { fontFamily: fontSerif, fontSize: 15, fontWeight: '700', color: P.text },
  topSpacer: { width: 72 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 },
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
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statCard: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statNum: { fontSize: 20, fontWeight: '700' },
  statLbl: { fontSize: 11, color: P.textL, marginTop: 4 },
  chipsScroll: { flexGrow: 0, marginBottom: 14 },
  chipsRow: { alignItems: 'center', gap: 6, paddingRight: 6 },
  chip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: P.beigeMid,
    backgroundColor: P.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: P.greenL, borderColor: P.green },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: P.textM,
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chipTextOn: { color: P.greenD, fontWeight: '600' },
  card: {
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeadMain: { flex: 1, paddingRight: 8 },
  cardId: { fontSize: 11, color: P.textL },
  cardUser: { fontSize: 15, fontWeight: '600', color: P.text, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardInfo: { fontSize: 13, color: P.textM, marginTop: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  stars: { fontSize: 14, color: '#f59e0b', letterSpacing: 2 },
  ratingLabel: { fontSize: 12, color: P.textM },
  ratingPending: { fontSize: 12, color: P.textL, marginTop: 8, fontStyle: 'italic' },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: P.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: P.textL, textAlign: 'center' },
  bottomSafe: {
    backgroundColor: P.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.beigeD,
  },
  bottomNav: {
    flexDirection: 'row',
    paddingVertical: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bnavBtn: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4 },
  bnavLabel: { fontSize: 11, color: P.textL, marginTop: 2 },
  bnavLabelOn: { color: P.green, fontWeight: '600' },
  pressed: { opacity: 0.88 },
});

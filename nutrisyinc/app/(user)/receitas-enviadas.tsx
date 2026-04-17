/**
 * Cliente — histórico de pedidos concluídos (entregues) com avaliação.
 * Ligado ao atalho **Minhas receitas enviadas** no perfil e ao lembrete na home.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import {
  avaliarPedidoClienteApi,
  fetchPedidosClienteTodosApi,
  type PedidoClienteHistoricoJson,
} from '@/lib/api';
import { fontSerif, P, radius } from '@/constants/prototypeTheme';

function formatValorBrl(v: number) {
  return v.toFixed(2).replace('.', ',');
}

function labelQuando(dataDdMmYyyy: string): string {
  const parts = dataDdMmYyyy.split('/');
  if (parts.length !== 3) return dataDdMmYyyy;
  const d = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10) - 1;
  const y = Number.parseInt(parts[2], 10);
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return dataDdMmYyyy;
  const dt = new Date(y, m, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - dt.getTime()) / 86400000);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 7) return `há ${diff} dias`;
  if (diff < 30) return `há ${Math.floor(diff / 7)} semanas`;
  return dataDdMmYyyy;
}

function pedidoTime(p: PedidoClienteHistoricoJson): number {
  if (p.criado_em_iso) {
    const t = Date.parse(p.criado_em_iso);
    if (!Number.isNaN(t)) return t;
  }
  const parts = p.data.split('/');
  if (parts.length === 3) {
    const d = Number.parseInt(parts[0], 10);
    const m = Number.parseInt(parts[1], 10) - 1;
    const y = Number.parseInt(parts[2], 10);
    if (!Number.isNaN(d) && !Number.isNaN(m) && !Number.isNaN(y)) {
      return new Date(y, m, d).getTime();
    }
  }
  return 0;
}

export default function ReceitasEnviadasScreen() {
  const router = useRouter();
  const { avaliar } = useLocalSearchParams<{ avaliar?: string }>();
  const { user, loading: authLoading } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoClienteHistoricoJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PedidoClienteHistoricoJson | null>(null);
  const [starsDraft, setStarsDraft] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const concluidos = useMemo(
    () =>
      pedidos
        .filter((p) => p.status === 'entregue')
        .sort((a, b) => pedidoTime(b) - pedidoTime(a)),
    [pedidos],
  );

  const tap = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  const loadPedidos = useCallback(async () => {
    if (!user || user.tipo !== 'cliente') return;
    setLoading(true);
    try {
      const res = await fetchPedidosClienteTodosApi(user.id);
      if (res.ok) setPedidos(res.pedidos);
      else setPedidos([]);
    } catch {
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user || user.tipo !== 'cliente') return;
      void loadPedidos();
    }, [user, loadPedidos]),
  );

  useEffect(() => {
    if (!avaliar || loading || concluidos.length === 0) return;
    const id = Number(avaliar);
    if (Number.isNaN(id)) return;
    const p = concluidos.find((x) => x.id === id);
    if (p) {
      setDetail(p);
      setStarsDraft(5);
    }
  }, [avaliar, loading, concluidos]);

  const closeDetail = useCallback(() => {
    setDetail(null);
    router.replace('/(user)/receitas-enviadas');
  }, [router]);

  const submitRating = useCallback(async () => {
    if (!detail?.pode_avaliar) return;
    setSubmitting(true);
    try {
      const res = await avaliarPedidoClienteApi(detail.id, starsDraft);
      if (res.ok) {
        await loadPedidos();
        closeDetail();
      } else {
        Alert.alert('Não foi possível avaliar', res.error);
      }
    } finally {
      setSubmitting(false);
    }
  }, [detail, starsDraft, loadPedidos, closeDetail]);

  if (authLoading || !user || user.tipo !== 'cliente') {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={P.green} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Modal
        visible={detail != null}
        transparent
        animationType="fade"
        onRequestClose={closeDetail}>
        <Pressable style={styles.detailBackdrop} onPress={closeDetail}>
          <Pressable style={styles.detailCard} onPress={(e) => e.stopPropagation()}>
            {detail ? (
              <>
                <Text style={styles.detailTitle}>
                  Pedido #{String(detail.id).padStart(4, '0')}
                </Text>
                <Text style={styles.detailCook}>{detail.cozinheiro_nome}</Text>
                <Text style={styles.detailMeta}>
                  {detail.marmita_nome ? `${detail.marmita_nome} · ` : ''}
                  {detail.qtd_marmitas} marmitas · R$ {formatValorBrl(detail.valor_total)}
                </Text>
                <Text style={styles.detailMeta}>
                  {labelQuando(detail.data)} · {detail.hora}
                </Text>

                {detail.pode_avaliar ? (
                  <View style={styles.rateBlock}>
                    <Text style={styles.rateLabel}>Sua avaliação</Text>
                    <View style={styles.starsRow}>
                      {([1, 2, 3, 4, 5] as const).map((n) => (
                        <Pressable
                          key={n}
                          onPress={() =>
                            tap(() => {
                              setStarsDraft(n);
                            })
                          }
                          hitSlop={6}>
                          <MaterialIcons
                            name={n <= starsDraft ? 'star' : 'star-border'}
                            size={36}
                            color={n <= starsDraft ? P.greenD : P.beigeMid}
                          />
                        </Pressable>
                      ))}
                    </View>
                    <Pressable
                      disabled={submitting}
                      onPress={() => tap(() => void submitRating())}
                      style={({ pressed }) => [
                        styles.btnPrimary,
                        pressed && styles.pressed,
                        submitting && styles.btnDisabled,
                      ]}>
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>Enviar avaliação</Text>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.rateBlock}>
                    <Text style={styles.rateLabel}>Avaliação</Text>
                    <Text style={styles.ratedText}>
                      {detail.avaliacao > 0 ? `★ ${detail.avaliacao.toFixed(1)}` : 'Sem nota'}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => tap(closeDetail)}
                  style={({ pressed }) => [styles.btnGhostFooter, pressed && styles.pressed]}>
                  <Text style={styles.btnGhostFooterText}>Fechar</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topnav}>
          <Pressable
            onPress={() =>
              tap(() => {
                if (router.canGoBack()) router.back();
                else router.replace('/(user)/perfil');
              })
            }
            style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}>
            <Text style={styles.btnGhostText}>← Voltar</Text>
          </Pressable>
          <Text style={styles.topTitle}>Minhas receitas enviadas</Text>
          <View style={styles.topSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          Pedidos entregues. Toque para ver detalhes e avaliar quando disponível.
        </Text>
        <View style={styles.section}>
          {loading ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={P.green} />
            </View>
          ) : concluidos.length === 0 ? (
            <Text style={styles.empty}>Nenhum pedido concluído ainda.</Text>
          ) : (
            concluidos.map((p) => (
              <Pressable
                key={p.id}
                onPress={() =>
                  tap(() => {
                    setDetail(p);
                    setStarsDraft(5);
                  })
                }
                style={({ pressed }) => [styles.pedidoCard, pressed && styles.pressed]}>
                <View style={styles.pedidoHeader}>
                  <View style={styles.pedidoHeaderText}>
                    <Text style={styles.pedidoId}>
                      Pedido #{String(p.id).padStart(4, '0')} · {labelQuando(p.data)}
                    </Text>
                    <Text style={styles.pedidoUser}>{p.cozinheiro_nome}</Text>
                  </View>
                  {p.pode_avaliar ? (
                    <View style={styles.badgeAvaliar}>
                      <Text style={styles.badgeAvaliarText}>Avaliar</Text>
                    </View>
                  ) : p.avaliacao > 0 ? (
                    <Text style={styles.miniStar}>★ {p.avaliacao.toFixed(1)}</Text>
                  ) : null}
                </View>
                <Text style={styles.pedidoInfo}>
                  {p.qtd_marmitas} marmitas · Total R$ {formatValorBrl(p.valor_total)} · {p.hora}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomNav}>
          <Pressable onPress={() => tap(() => router.replace('/(user)/home'))} style={styles.bnavItem}>
            <MaterialIcons name="home" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Início</Text>
          </Pressable>
          <Pressable onPress={() => tap(() => {})} style={styles.bnavItem}>
            <MaterialIcons name="search" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Buscar</Text>
          </Pressable>
          <Pressable onPress={() => tap(() => router.push('/(user)/meus-pedidos'))} style={styles.bnavItem}>
            <MaterialIcons name="receipt-long" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Pedidos</Text>
          </Pressable>
          <Pressable onPress={() => tap(() => router.push('/(user)/perfil'))} style={styles.bnavItem}>
            <MaterialIcons name="person-outline" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Perfil</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: P.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    flex: 1,
    backgroundColor: P.cream,
  },
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  detailCard: {
    backgroundColor: P.white,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: P.beigeD,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  detailTitle: {
    fontFamily: fontSerif,
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
    marginBottom: 6,
  },
  detailCook: {
    fontSize: 15,
    fontWeight: '600',
    color: P.text,
    marginBottom: 8,
  },
  detailMeta: {
    fontSize: 13,
    color: P.textM,
    lineHeight: 20,
  },
  rateBlock: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.beigeD,
  },
  rateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: P.textM,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  btnPrimary: {
    backgroundColor: P.greenD,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  ratedText: {
    fontSize: 22,
    fontWeight: '700',
    color: P.greenD,
  },
  btnGhostFooter: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnGhostFooterText: {
    fontSize: 15,
    fontWeight: '600',
    color: P.textM,
  },
  safeTop: {
    backgroundColor: P.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.beigeD,
  },
  topnav: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnGhost: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 72,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '500',
    color: P.textM,
  },
  topTitle: {
    fontFamily: fontSerif,
    fontSize: 14,
    fontWeight: '700',
    color: P.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  topSpacer: {
    width: 56,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  lead: {
    fontSize: 13,
    color: P.textM,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    lineHeight: 20,
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    paddingHorizontal: 16,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  centerPad: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  empty: {
    fontSize: 14,
    color: P.textL,
    textAlign: 'center',
    paddingVertical: 24,
  },
  pedidoCard: {
    backgroundColor: P.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.beigeD,
    padding: 14,
    marginBottom: 10,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pedidoHeaderText: {
    flex: 1,
    paddingRight: 8,
  },
  pedidoId: {
    fontSize: 13,
    fontWeight: '600',
    color: P.text,
  },
  pedidoUser: {
    fontSize: 13,
    color: P.textM,
    marginTop: 4,
  },
  pedidoInfo: {
    fontSize: 12,
    color: P.textM,
    lineHeight: 18,
  },
  badgeAvaliar: {
    backgroundColor: P.greenL,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: P.green,
  },
  badgeAvaliarText: {
    fontSize: 11,
    fontWeight: '700',
    color: P.greenD,
  },
  miniStar: {
    fontSize: 14,
    fontWeight: '700',
    color: P.brownBtn,
  },
  bottomSafe: {
    backgroundColor: P.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.beigeD,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  bnavItem: {
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
  },
  bnavLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: P.textL,
  },
  pressed: {
    opacity: 0.85,
  },
});

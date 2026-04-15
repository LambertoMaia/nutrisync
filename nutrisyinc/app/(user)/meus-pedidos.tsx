/**
 * Cliente — lista de pedidos (`web-prototype/meus-pedidos.html`).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { fetchPedidosClienteTodosApi, type PedidoClienteHistoricoJson } from '@/lib/api';
import { fontSerif, P, radius } from '@/constants/prototypeTheme';

function formatValorBrl(v: number) {
  return v.toFixed(2).replace('.', ',');
}

/** Rótulo tipo protótipo: "hoje", "ontem", "há N dias" ou data. */
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

function badgeForStatus(status: string): { label: string; variant: 'prep' | 'done' | 'muted' } {
  if (status === 'entregue') return { label: 'Entregue', variant: 'done' };
  if (status === 'cancelado') return { label: 'Cancelado', variant: 'muted' };
  if (status === 'saiu_entrega') return { label: 'A caminho', variant: 'prep' };
  return { label: 'Em preparo', variant: 'prep' };
}

export default function MeusPedidosScreen() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoClienteHistoricoJson[]>([]);
  const [loading, setLoading] = useState(true);

  const tap = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  const loadPedidos = useCallback(async () => {
    if (!user || user.tipo !== 'cliente') return;
    setLoading(true);
    try {
      const res = await fetchPedidosClienteTodosApi(user.id);
      if (res.ok) {
        setPedidos(res.pedidos);
      } else {
        setPedidos([]);
      }
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

  const onLogout = useCallback(async () => {
    setMenuOpen(false);
    await logout();
    router.replace('/(tabs)');
  }, [logout, router]);

  if (authLoading || !user || user.tipo !== 'cliente') {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={P.green} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.menuTitle}>Conta</Text>
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              onPress={() => tap(() => setMenuOpen(false))}>
              <MaterialIcons name="person-outline" size={22} color={P.textM} />
              <Text style={styles.menuRowText}>Meu perfil</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
              onPress={() => tap(() => void onLogout())}>
              <MaterialIcons name="logout" size={22} color={P.textM} />
              <Text style={styles.menuRowText}>Sair</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topnav}>
          <Pressable
            onPress={() =>
              tap(() => {
                if (router.canGoBack()) router.back();
                else router.replace('/(user)/home');
              })
            }
            style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}>
            <Text style={styles.btnGhostText}>← Voltar</Text>
          </Pressable>
          <Text style={styles.topTitle}>Meus Pedidos</Text>
          <View style={styles.topSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {loading ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={P.green} />
            </View>
          ) : pedidos.length === 0 ? (
            <Text style={styles.empty}>Nenhum pedido ainda.</Text>
          ) : (
            pedidos.map((p) => {
              const badge = badgeForStatus(p.status);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => tap(() => {})}
                  style={({ pressed }) => [styles.pedidoCard, pressed && styles.pressed]}>
                  <View style={styles.pedidoHeader}>
                    <View style={styles.pedidoHeaderText}>
                      <Text style={styles.pedidoId}>
                        Pedido #{String(p.id).padStart(4, '0')} · {labelQuando(p.data)}
                      </Text>
                      <Text style={styles.pedidoUser}>{p.cozinheiro_nome}</Text>
                    </View>
                    <View
                      style={[
                        styles.pbadge,
                        badge.variant === 'prep' && styles.pbadgePrep,
                        badge.variant === 'done' && styles.pbadgeDone,
                        badge.variant === 'muted' && styles.pbadgeMuted,
                      ]}>
                      <Text
                        style={[
                          styles.pbadgeText,
                          badge.variant === 'prep' && styles.pbadgeTextPrep,
                          badge.variant === 'done' && styles.pbadgeTextDone,
                          badge.variant === 'muted' && styles.pbadgeTextMuted,
                        ]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.pedidoInfo}>
                    {p.qtd_marmitas} marmitas · Total R$ {formatValorBrl(p.valor_total)}
                    {' · '}
                    {p.hora}
                    {p.status === 'entregue' && p.pode_avaliar ? (
                      <Text style={styles.avaliarLink}> · Avaliar →</Text>
                    ) : null}
                    {p.status === 'entregue' && !p.pode_avaliar && p.avaliacao > 0 ? (
                      <Text style={styles.avaliado}> · ★ {p.avaliacao} avaliado</Text>
                    ) : null}
                  </Text>
                </Pressable>
              );
            })
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
          <View style={styles.bnavItem}>
            <MaterialIcons name="receipt-long" size={20} color={P.green} />
            <Text style={[styles.bnavLabel, styles.bnavLabelOn]}>Pedidos</Text>
          </View>
          <Pressable onPress={() => tap(() => setMenuOpen(true))} style={styles.bnavItem}>
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
    fontSize: 15,
    fontWeight: '700',
    color: P.text,
  },
  topSpacer: {
    width: 72,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
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
    marginTop: 2,
  },
  pbadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pbadgePrep: {
    backgroundColor: P.greenL,
  },
  pbadgeDone: {
    backgroundColor: '#e8f0fb',
  },
  pbadgeMuted: {
    backgroundColor: P.beige,
  },
  pbadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pbadgeTextPrep: {
    color: P.greenD,
  },
  pbadgeTextDone: {
    color: '#1a3a6b',
  },
  pbadgeTextMuted: {
    color: P.textM,
  },
  pedidoInfo: {
    fontSize: 12,
    color: P.textM,
    lineHeight: 18,
  },
  avaliarLink: {
    color: P.green,
    fontWeight: '600',
  },
  avaliado: {
    color: P.brownBtn,
    fontWeight: '500',
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
  bnavLabelOn: {
    color: P.green,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 12,
  },
  menuCard: {
    backgroundColor: P.white,
    borderRadius: radius.md,
    paddingVertical: 8,
    minWidth: 200,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.beigeD,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: P.textL,
    paddingHorizontal: 14,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuRowText: {
    fontSize: 15,
    color: P.text,
  },
});

import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { LogoIcon } from '@/components/prototype/LogoIcon';
import { fontSerif, logoSize, P, radius } from '@/constants/prototypeTheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchPedidosCozinheiroApi,
  putPedidoStatusApi,
  type PedidoCozinheiroJson,
} from '@/lib/api';
import { Routes } from '@/constants/routes';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function parsePedidoDateBr(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  const h = m[4] ? parseInt(m[4], 10) : 12;
  const min = m[5] ? parseInt(m[5], 10) : 0;
  return new Date(y, mo, d, h, min);
}

function isInCurrentWeekBr(pedidoDataStr: string, now = new Date()): boolean {
  const p = parsePedidoDateBr(pedidoDataStr);
  if (!p) return false;
  return startOfWeekMonday(p).getTime() === startOfWeekMonday(now).getTime();
}

const NOVOS = new Set(['pendente', 'confirmado']);
const PREPARO = new Set(['preparando', 'saiu_entrega']);

function badgeStyle(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case 'pendente':
      return { bg: P.greenL, color: P.greenD, label: 'Pendente' };
    case 'confirmado':
      return { bg: '#e8f5e9', color: P.greenD, label: 'Novo' };
    case 'preparando':
      return { bg: '#fff3cc', color: '#7a4f00', label: 'Em preparo' };
    case 'saiu_entrega':
      return { bg: '#e3f2fd', color: '#1565c0', label: 'Saiu entrega' };
    case 'entregue':
      return { bg: P.beigeD, color: P.textM, label: 'Entregue' };
    case 'cancelado':
      return { bg: '#ffebee', color: '#c62828', label: 'Cancelado' };
    default:
      return { bg: P.beigeD, color: P.textM, label: status };
  }
}

function nextActions(status: string): { primary?: { label: string; next: string }; secondary?: { label: string; next: string } } {
  switch (status) {
    case 'pendente':
      return {
        primary: { label: 'Aceitar pedido', next: 'confirmado' },
        secondary: { label: 'Recusar', next: 'cancelado' },
      };
    case 'confirmado':
      return {
        primary: { label: '✓ Iniciar preparo', next: 'preparando' },
        secondary: { label: 'Cancelar', next: 'cancelado' },
      };
    case 'preparando':
      return {
        primary: { label: 'Marcar como pronto / Saiu entrega', next: 'saiu_entrega' },
        secondary: { label: 'Cancelar', next: 'cancelado' },
      };
    case 'saiu_entrega':
      return { primary: { label: 'Marcar entregue', next: 'entregue' } };
    default:
      return {};
  }
}

export default function CookDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoCozinheiroJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

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

  const { novos, preparo, stats } = useMemo(() => {
    const n: PedidoCozinheiroJson[] = [];
    const p: PedidoCozinheiroJson[] = [];
    let semana = 0;
    for (const ped of pedidos) {
      if (NOVOS.has(ped.status)) n.push(ped);
      else if (PREPARO.has(ped.status)) p.push(ped);
      if (ped.status !== 'cancelado' && isInCurrentWeekBr(ped.data)) {
        semana += ped.valor_total;
      }
    }
    return {
      novos: n,
      preparo: p,
      stats: { novos: n.length, preparo: p.length, semana },
    };
  }, [pedidos]);

  const applyStatus = useCallback(
    async (pedidoId: number, status: string) => {
      setUpdatingId(pedidoId);
      try {
        const res = await putPedidoStatusApi(pedidoId, status);
        if (res.ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await load();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Pedido', res.error);
        }
      } finally {
        setUpdatingId(null);
      }
    },
    [load],
  );

  const onConfirmAction = useCallback(
    (pedidoId: number, label: string, next: string) => {
      if (next === 'cancelado') {
        Alert.alert('Cancelar pedido', 'Deseja cancelar este pedido?', [
          { text: 'Não', style: 'cancel' },
          { text: 'Sim, cancelar', style: 'destructive', onPress: () => applyStatus(pedidoId, next) },
        ]);
        return;
      }
      applyStatus(pedidoId, next);
    },
    [applyStatus],
  );

  const openReceita = useCallback((link: string | null | undefined) => {
    if (!link || !/^https?:\/\//i.test(link.trim())) {
      Alert.alert('Receita', 'Nenhum link de receita disponível para este pedido.');
      return;
    }
    Linking.openURL(link.trim());
  }, []);

  if (!user) {
    return <Redirect href={Routes.login} />;
  }
  if (user.tipo !== 'cozinheiro') {
    return <Redirect href={Routes.tabs} />;
  }

  const initial = user.nome?.trim()?.charAt(0)?.toUpperCase() ?? 'C';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topnav}>
        <Pressable onPress={() => router.replace(Routes.tabs)} style={styles.topLeft}>
          <LogoIcon size={logoSize.nav} />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>Nutrilho</Text>
            <Text style={styles.brandTag}>painel do cozinheiro</Text>
          </View>
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{initial}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={P.green} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
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
              <Text style={[styles.statNum, { color: P.greenD }]}>{stats.novos}</Text>
              <Text style={styles.statLbl}>Novos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: P.brownBtn }]}>{stats.preparo}</Text>
              <Text style={styles.statLbl}>Em preparo</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: P.text, fontSize: 18 }]}>{formatBrl(stats.semana)}</Text>
              <Text style={styles.statLbl}>Esta semana</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Novos pedidos</Text>
          {novos.length === 0 ? (
            <Text style={styles.emptyHint}>Nenhum pedido novo no momento.</Text>
          ) : (
            novos.map((ped) => (
              <PedidoCookCard
                key={ped.id}
                pedido={ped}
                busy={updatingId === ped.id}
                onAction={onConfirmAction}
                onVerReceita={() => openReceita(ped.proposta?.receita_link)}
              />
            ))
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Em preparo</Text>
          {preparo.length === 0 ? (
            <Text style={styles.emptyHint}>Nada em preparo agora.</Text>
          ) : (
            preparo.map((ped) => (
              <PedidoCookCard
                key={ped.id}
                pedido={ped}
                busy={updatingId === ped.id}
                onAction={onConfirmAction}
                onVerReceita={() => openReceita(ped.proposta?.receita_link)}
              />
            ))
          )}
        </ScrollView>
      )}

      <View style={styles.bottomNav}>
        <Pressable style={styles.bnavBtn} onPress={() => {}}>
          <MaterialIcons name="home" size={22} color={P.green} />
          <Text style={[styles.bnavLabel, { color: P.green }]}>Pedidos</Text>
        </Pressable>
        <Pressable
          style={styles.bnavBtn}
          onPress={() => Alert.alert('Histórico', 'Em breve: histórico completo de pedidos.')}>
          <MaterialIcons name="event-note" size={22} color={P.textL} />
          <Text style={styles.bnavLabel}>Histórico</Text>
        </Pressable>
        <Pressable
          style={styles.bnavBtn}
          onPress={() => Alert.alert('Perfil', 'Em breve: edição do perfil do cozinheiro.')}>
          <MaterialIcons name="person-outline" size={22} color={P.textL} />
          <Text style={styles.bnavLabel}>Perfil</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function PedidoCookCard({
  pedido,
  busy,
  onAction,
  onVerReceita,
}: {
  pedido: PedidoCozinheiroJson;
  busy: boolean;
  onAction: (pedidoId: number, label: string, next: string) => void;
  onVerReceita: () => void;
}) {
  const b = badgeStyle(pedido.status);
  const actions = nextActions(pedido.status);
  const pr = pedido.proposta;
  const primaryLabel =
    actions.primary && (pedido.status === 'pendente' || pedido.status === 'confirmado')
      ? `${actions.primary.label} — ${formatBrl(pedido.valor_total)}`
      : actions.primary?.label;

  return (
    <View style={styles.pedidoCard}>
      <View style={styles.pedidoHeader}>
        <View>
          <Text style={styles.pedidoId}>
            Pedido #{pedido.id} · {pedido.data}
          </Text>
          <Text style={styles.pedidoUser}>{pedido.cliente_nome}</Text>
        </View>
        <View style={[styles.pbadge, { backgroundColor: b.bg }]}>
          <Text style={[styles.pbadgeText, { color: b.color }]}>{b.label}</Text>
        </View>
      </View>

      <Text style={styles.pedidoInfo}>
        {pedido.qtd_marmitas} marmitas · {formatBrl(pedido.valor_total)}
      </Text>
      {pedido.endereco_entrega ? (
        <Text style={styles.pedidoAddr} numberOfLines={3}>
          {pedido.endereco_entrega}
        </Text>
      ) : null}

      <View style={styles.receitaBox}>
        <Text style={styles.receitaLbl}>Receita / proposta</Text>
        <Text style={styles.receitaBody}>
          {pr
            ? `Proposta #${pr.id} — ${formatBrl(pr.valor)}${
                pr.receita_link ? '\nHá link de receita anexo.' : ''
              }`
            : 'Sem proposta vinculada neste pedido.'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        {actions.primary ? (
          <Pressable
            disabled={busy}
            onPress={() => onAction(pedido.id, actions.primary!.label, actions.primary!.next)}
            style={({ pressed }) => [
              styles.btnAccept,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnAcceptText}>{primaryLabel}</Text>
            )}
          </Pressable>
        ) : null}
        {actions.secondary ? (
          <Pressable
            disabled={busy}
            onPress={() => onAction(pedido.id, actions.secondary!.label, actions.secondary!.next)}
            style={({ pressed }) => [
              styles.btnReject,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}>
            <Text style={styles.btnRejectText}>{actions.secondary.label}</Text>
          </Pressable>
        ) : null}
      </View>

      {(pedido.status === 'preparando' || pedido.status === 'saiu_entrega') && (
        <View style={styles.prepRow}>
          <Pressable
            onPress={onVerReceita}
            style={({ pressed }) => [styles.btnOutline, pressed && styles.pressed]}>
            <Text style={styles.btnOutlineText}>Ver receita</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.beige },
  topnav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: P.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.beigeD,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  brandText: { justifyContent: 'center' },
  brandName: {
    fontFamily: fontSerif,
    fontSize: 17,
    fontWeight: '700',
    color: P.text,
  },
  brandTag: { fontSize: 11, color: P.textL, marginTop: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.verifyBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 16, fontWeight: '700', color: '#7a4f00' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 12 },
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
  statsRow: { flexDirection: 'row', gap: 9, marginBottom: 18 },
  statCard: {
    flex: 1,
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLbl: { fontSize: 11, color: P.textL, marginTop: 4 },
  sectionTitle: { fontWeight: '600', fontSize: 14, color: P.text, marginBottom: 10 },
  emptyHint: { fontSize: 13, color: P.textL, marginBottom: 12 },
  divider: { height: 1, backgroundColor: P.beigeD, marginVertical: 18 },
  pedidoCard: {
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  pedidoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pedidoId: { fontSize: 12, color: P.textL },
  pedidoUser: { fontSize: 16, fontWeight: '600', color: P.text, marginTop: 2 },
  pbadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pbadgeText: { fontSize: 11, fontWeight: '600' },
  pedidoInfo: { fontSize: 13, color: P.textM, marginTop: 10 },
  pedidoAddr: { fontSize: 12, color: P.textL, marginTop: 6 },
  receitaBox: {
    marginTop: 10,
    backgroundColor: P.cream,
    borderRadius: radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: P.beigeD,
  },
  receitaLbl: { fontSize: 11, fontWeight: '600', color: P.textM, marginBottom: 4 },
  receitaBody: { fontSize: 12, color: P.text, lineHeight: 18 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btnAccept: {
    flex: 1,
    minWidth: 140,
    backgroundColor: P.green,
    paddingVertical: 11,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  btnAcceptText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnReject: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    paddingVertical: 11,
    borderRadius: radius.sm,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  btnRejectText: { color: P.textM, fontSize: 12, fontWeight: '500' },
  prepRow: { marginTop: 10 },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  btnOutlineText: { color: P.textM, fontSize: 13, fontWeight: '600' },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.beigeD,
    backgroundColor: P.white,
    paddingBottom: 8,
    paddingTop: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bnavBtn: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 4 },
  bnavLabel: { fontSize: 11, color: P.textL, marginTop: 2 },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.55 },
});

/**
 * Cozinheiro — Perfil (referência visual adaptada de `web-prototype/perfil.html`
 * e da `app/(user)/perfil.tsx`, mas com estatísticas do painel do cozinheiro).
 *
 * Dados da sessão (nome/email) vêm do `AuthContext`; o resumo (pedidos,
 * entregues, avaliação média) é calculado a partir de
 * `fetchPedidosCozinheiroApi` — o mesmo endpoint já usado no dashboard.
 * "Editar perfil" continua placeholder até existir rota/endpoint dedicado.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Routes } from '@/constants/routes';
import { fontSerif, P, radius } from '@/constants/prototypeTheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  atualizarPerfilEntregaCozinheiroApi,
  fetchPedidosCozinheiroApi,
  fetchPerfilCozinheiroApi,
  type PedidoCozinheiroJson,
  type PerfilCozinheiroJson,
} from '@/lib/api';
import { brlToNumber, maskBrlFromDigits } from '@/lib/masks';
import { initialFromName } from '@/lib/name';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statsFromPedidos(pedidos: PedidoCozinheiroJson[]) {
  const total = pedidos.length;
  const entregues = pedidos.filter((p) => p.status === 'entregue');
  const ativos = pedidos.filter((p) =>
    ['pendente', 'confirmado', 'preparando', 'saiu_entrega'].includes(p.status),
  );
  const faturamento = entregues.reduce((s, p) => s + p.valor_total, 0);
  const rated = entregues.filter((p) => p.avaliacao > 0);
  const media =
    rated.length > 0 ? rated.reduce((s, p) => s + p.avaliacao, 0) / rated.length : null;
  return {
    total,
    entregues: entregues.length,
    ativos: ativos.length,
    faturamento,
    mediaLabel: media != null ? `${media.toFixed(1)}★` : '—',
    mediaCount: rated.length,
  };
}

export default function CookPerfilScreen() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoCozinheiroJson[]>([]);
  const [perfil, setPerfil] = useState<PerfilCozinheiroJson | null>(null);
  const [loading, setLoading] = useState(true);
  // Edição inline das configurações de entrega (PLAN_USUARIO §9.2).
  const [motoboyOn, setMotoboyOn] = useState(false);
  const [motoboyValor, setMotoboyValor] = useState<string>('R$ 0,00');
  const [parceirosOn, setParceirosOn] = useState(false);
  const [parceirosValor, setParceirosValor] = useState<string>('R$ 0,00');
  const [savingEntrega, setSavingEntrega] = useState(false);

  const tap = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  const uid = user?.id;

  const load = useCallback(async () => {
    if (user?.tipo !== 'cozinheiro' || uid == null) return;
    setLoading(true);
    try {
      const [pedidosRes, perfilRes] = await Promise.all([
        fetchPedidosCozinheiroApi(uid),
        fetchPerfilCozinheiroApi(),
      ]);
      if (pedidosRes.ok) setPedidos(pedidosRes.pedidos);
      else setPedidos([]);
      if (perfilRes.ok) setPerfil(perfilRes.data);
      else setPerfil(null);
    } finally {
      setLoading(false);
    }
  }, [user?.tipo, uid]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Sincroniza inputs com o payload do perfil sempre que chega novo fetch.
  useEffect(() => {
    if (!perfil) return;
    const hasMotoboy = perfil.taxa_motoboy != null;
    setMotoboyOn(hasMotoboy);
    setMotoboyValor(
      maskBrlFromDigits(
        hasMotoboy ? String(Math.round((perfil.taxa_motoboy ?? 0) * 100)) : '0',
      ),
    );
    setParceirosOn(!!perfil.aceita_parceiros);
    setParceirosValor(
      maskBrlFromDigits(
        perfil.taxa_parceiros != null
          ? String(Math.round(perfil.taxa_parceiros * 100))
          : '0',
      ),
    );
  }, [perfil]);

  const stats = useMemo(() => statsFromPedidos(pedidos), [pedidos]);

  const salvarEntrega = useCallback(async () => {
    setSavingEntrega(true);
    try {
      const res = await atualizarPerfilEntregaCozinheiroApi({
        taxa_motoboy: motoboyOn ? brlToNumber(motoboyValor) : null,
        aceita_parceiros: parceirosOn,
        taxa_parceiros: parceirosOn ? brlToNumber(parceirosValor) : null,
      });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await load();
      } else {
        Alert.alert('Entregas', res.error);
      }
    } finally {
      setSavingEntrega(false);
    }
  }, [motoboyOn, motoboyValor, parceirosOn, parceirosValor, load]);

  const onLogout = useCallback(async () => {
    await logout();
    router.replace(Routes.tabs);
  }, [logout, router]);

  if (authLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={P.green} />
      </View>
    );
  }
  if (!user) return <Redirect href={Routes.login} />;
  if (user.tipo !== 'cozinheiro') return <Redirect href={Routes.tabs} />;

  const nome = user.nome ?? '';
  const email = user.email ?? '';
  const initial = initialFromName(nome);

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
          <Text style={styles.topTitle}>Meu Perfil</Text>
          <View style={styles.topSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroOuter}>
          <View style={styles.heroTint} pointerEvents="none" />
          <View style={styles.heroInner}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.heroName} numberOfLines={2}>
              {nome || '—'}
            </Text>
            <Text style={styles.heroTag}>Cozinheiro</Text>
            {email ? (
              <Text style={styles.heroSub} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.resumoKicker}>Resumo</Text>
          <View style={[styles.card, styles.cardResumo]}>
            {loading ? (
              <View style={styles.centerPad}>
                <ActivityIndicator color={P.green} />
              </View>
            ) : (
              <View style={styles.resumoGrid}>
                <View style={styles.resumoCell}>
                  <Text style={styles.resumoNum}>{stats.total}</Text>
                  <Text style={styles.resumoLbl}>Pedidos</Text>
                </View>
                <View style={styles.resumoCell}>
                  <Text style={styles.resumoNum}>{stats.entregues}</Text>
                  <Text style={styles.resumoLbl}>Entregues</Text>
                </View>
                <View style={styles.resumoCell}>
                  <Text style={styles.resumoNum}>{stats.mediaLabel}</Text>
                  <Text style={styles.resumoLbl}>
                    {stats.mediaCount > 0 ? `Média (${stats.mediaCount})` : 'Avaliação'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <MaterialIcons name="pending-actions" size={20} color={P.green} />
              <View style={styles.metricCol}>
                <Text style={styles.metricNum}>{stats.ativos}</Text>
                <Text style={styles.metricLbl}>Em andamento</Text>
              </View>
            </View>
            <View style={styles.metricCard}>
              <MaterialIcons name="attach-money" size={20} color={P.brownBtn} />
              <View style={styles.metricCol}>
                <Text style={styles.metricNum}>{formatBrl(stats.faturamento)}</Text>
                <Text style={styles.metricLbl}>Faturamento</Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => tap(() => router.push(Routes.cookHistorico))}
            style={({ pressed }) => [styles.card, styles.cardRow, pressed && styles.pressed]}>
            <Text style={styles.cardRowText}>Ver histórico de pedidos</Text>
            <Text style={styles.cardArrow}>→</Text>
          </Pressable>
          <Pressable
            onPress={() => tap(() => router.push(Routes.cookSolicitacoes))}
            style={({ pressed }) => [styles.card, styles.cardRow, pressed && styles.pressed]}>
            <Text style={styles.cardRowText}>Solicitações abertas</Text>
            <Text style={styles.cardArrow}>→</Text>
          </Pressable>

          <View style={styles.card}>
            <View style={styles.entregaHeader}>
              <MaterialIcons name="delivery-dining" size={20} color={P.greenD} />
              <Text style={styles.entregaTitle}>Entregas & taxas</Text>
            </View>
            <Text style={styles.entregaHint}>
              Estas opções controlam o que o cliente pode escolher ao aceitar a sua proposta.
              Retirada no local está sempre disponível e é gratuita.
            </Text>

            <View style={styles.entregaRow}>
              <View style={styles.entregaCol}>
                <Text style={styles.entregaLabel}>Delivery moto-boy próprio</Text>
                <Text style={styles.entregaSub}>
                  Se ligado, o cliente verá a opção &quot;Delivery Moto boy&quot; com a taxa
                  abaixo e você precisará informar o tempo estimado na proposta.
                </Text>
              </View>
              <Switch
                value={motoboyOn}
                onValueChange={(v) => tap(() => setMotoboyOn(v))}
                trackColor={{ false: P.beigeMid, true: P.green }}
                thumbColor={motoboyOn ? P.greenD : P.white}
              />
            </View>
            {motoboyOn ? (
              <TextInput
                style={styles.entregaInput}
                value={motoboyValor}
                onChangeText={(t) => setMotoboyValor(maskBrlFromDigits(t))}
                keyboardType="numeric"
                placeholder="R$ 0,00"
                placeholderTextColor={P.textL}
              />
            ) : null}

            <View style={[styles.entregaRow, styles.entregaRowGap]}>
              <View style={styles.entregaCol}>
                <Text style={styles.entregaLabel}>Parceiros (iFood/Rappi)</Text>
                <Text style={styles.entregaSub}>
                  Taxa que você passa para o cliente quando usa integrações com apps parceiros.
                </Text>
              </View>
              <Switch
                value={parceirosOn}
                onValueChange={(v) => tap(() => setParceirosOn(v))}
                trackColor={{ false: P.beigeMid, true: P.green }}
                thumbColor={parceirosOn ? P.greenD : P.white}
              />
            </View>
            {parceirosOn ? (
              <TextInput
                style={styles.entregaInput}
                value={parceirosValor}
                onChangeText={(t) => setParceirosValor(maskBrlFromDigits(t))}
                keyboardType="numeric"
                placeholder="R$ 0,00"
                placeholderTextColor={P.textL}
              />
            ) : null}

            <Pressable
              disabled={savingEntrega || loading}
              onPress={() => tap(() => void salvarEntrega())}
              style={({ pressed }) => [
                styles.entregaSaveBtn,
                (savingEntrega || loading) && styles.entregaSaveBtnDisabled,
                pressed && styles.pressed,
              ]}>
              {savingEntrega ? (
                <ActivityIndicator color={P.white} />
              ) : (
                <Text style={styles.entregaSaveText}>Salvar configuração de entrega</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() =>
              tap(() =>
                Alert.alert(
                  'Em breve',
                  'Editar nome, endereço e especialidades estará disponível em breve.',
                ),
              )
            }
            style={({ pressed }) => [styles.card, styles.cardRow, pressed && styles.pressed]}>
            <Text style={styles.cardRowText}>Editar perfil e especialidades</Text>
            <Text style={styles.cardArrow}>→</Text>
          </Pressable>

          <Pressable
            onPress={() => tap(() => void onLogout())}
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}>
            <Text style={styles.btnSecondaryText}>Sair</Text>
          </Pressable>
        </View>
      </ScrollView>

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
          <Pressable
            style={styles.bnavBtn}
            onPress={() => tap(() => router.push(Routes.cookHistorico))}>
            <MaterialIcons name="event-note" size={22} color={P.textL} />
            <Text style={styles.bnavLabel}>Histórico</Text>
          </Pressable>
          <View style={styles.bnavBtn}>
            <MaterialIcons name="person-outline" size={22} color={P.green} />
            <Text style={[styles.bnavLabel, styles.bnavLabelOn]}>Perfil</Text>
          </View>
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
  root: { flex: 1, backgroundColor: P.cream },
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  heroOuter: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: P.beige,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.beigeD,
  },
  heroTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: P.greenL,
    opacity: 0.65,
  },
  heroInner: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: P.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: P.beigeMid,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: P.greenD },
  heroName: {
    fontFamily: fontSerif,
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
    textAlign: 'center',
  },
  heroTag: {
    fontSize: 11,
    fontWeight: '600',
    color: P.greenD,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  heroSub: { fontSize: 12, color: P.textL, marginTop: 6, textAlign: 'center' },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  resumoKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: P.textM,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  card: {
    backgroundColor: P.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.beigeD,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 10,
  },
  cardResumo: { paddingVertical: 16 },
  centerPad: { paddingVertical: 16, alignItems: 'center' },
  resumoGrid: { flexDirection: 'row', gap: 8 },
  resumoCell: { flex: 1, alignItems: 'center' },
  resumoNum: { fontSize: 20, fontWeight: '700', color: P.greenD },
  resumoLbl: { fontSize: 11, color: P.textL, marginTop: 4 },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metricCol: { flex: 1 },
  metricNum: { fontSize: 14, fontWeight: '700', color: P.text },
  metricLbl: { fontSize: 11, color: P.textL, marginTop: 2 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  cardRowText: {
    fontWeight: '500',
    fontSize: 14,
    color: P.text,
    flex: 1,
    paddingRight: 8,
  },
  cardArrow: { fontSize: 16, color: P.textL },
  entregaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  entregaTitle: {
    fontFamily: fontSerif,
    fontSize: 15,
    fontWeight: '700',
    color: P.text,
  },
  entregaHint: {
    fontSize: 12,
    color: P.textL,
    lineHeight: 18,
    marginBottom: 12,
  },
  entregaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  entregaRowGap: { marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.beigeD, paddingTop: 14 },
  entregaCol: { flex: 1 },
  entregaLabel: { fontSize: 13, fontWeight: '600', color: P.text },
  entregaSub: { fontSize: 11, color: P.textL, marginTop: 3, lineHeight: 15 },
  entregaInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: P.text,
    backgroundColor: P.white,
  },
  entregaSaveBtn: {
    marginTop: 14,
    backgroundColor: P.green,
    paddingVertical: 11,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  entregaSaveBtnDisabled: { backgroundColor: P.beigeMid },
  entregaSaveText: { fontSize: 13, fontWeight: '700', color: P.white },
  btnSecondary: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    backgroundColor: P.white,
    alignItems: 'center',
    marginTop: 6,
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: P.brownBtn },
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

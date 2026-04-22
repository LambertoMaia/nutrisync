/**
 * Cliente — perfil (`web-prototype/perfil.html`).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
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

import { useAuth } from '@/contexts/AuthContext';
import { fetchPedidosClienteTodosApi, fetchPerfilClienteApi, type PerfilClienteJson, type PedidoClienteHistoricoJson } from '@/lib/api';
import { maskPhoneBR } from '@/lib/masks';
import { initialFromName } from '@/lib/name';
import { fontSerif, P, radius } from '@/constants/prototypeTheme';

function chipsFromRestricao(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function statsFromPedidos(pedidos: PedidoClienteHistoricoJson[]) {
  const nPedidos = pedidos.length;
  const cozinheiros = new Set(pedidos.map((p) => p.cozinheiro_id)).size;
  const rated = pedidos.filter((p) => p.status === 'entregue' && p.avaliacao > 0);
  const avg =
    rated.length > 0 ? rated.reduce((s, p) => s + p.avaliacao, 0) / rated.length : null;
  return {
    nPedidos,
    cozinheiros,
    mediaLabel: avg != null ? `★${avg.toFixed(1)}` : '—',
  };
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [perfil, setPerfil] = useState<PerfilClienteJson | null>(null);
  const [pedidos, setPedidos] = useState<PedidoClienteHistoricoJson[]>([]);
  const [loading, setLoading] = useState(true);

  const tap = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  const load = useCallback(async () => {
    if (!user || user.tipo !== 'cliente') return;
    setLoading(true);
    try {
      const [pRes, pedRes] = await Promise.all([fetchPerfilClienteApi(), fetchPedidosClienteTodosApi(user.id)]);
      if (pRes.ok) setPerfil(pRes.data);
      else setPerfil(null);
      if (pedRes.ok) setPedidos(pedRes.pedidos);
      else setPedidos([]);
    } catch {
      setPerfil(null);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user || user.tipo !== 'cliente') return;
      void load();
    }, [user, load]),
  );

  const onLogout = useCallback(async () => {
    await logout();
    router.replace('/(tabs)');
  }, [logout, router]);

  const stats = useMemo(() => statsFromPedidos(pedidos), [pedidos]);

  const nome = perfil?.nome ?? user?.nome ?? '';
  const email = perfil?.email ?? user?.email ?? '';
  const telefoneDigits = perfil?.telefone?.replace(/\D/g, '') ?? '';
  const phoneLine =
    email && telefoneDigits
      ? `${email} · ${maskPhoneBR(telefoneDigits)}`
      : email || (telefoneDigits ? maskPhoneBR(telefoneDigits) : '');
  const initial = initialFromName(nome);
  const chips = chipsFromRestricao(perfil?.restricao ?? null);

  if (authLoading || !user || user.tipo !== 'cliente') {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={P.green} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
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
            {phoneLine ? (
              <Text style={styles.heroSub} numberOfLines={2}>
                {phoneLine}
              </Text>
            ) : null}
            {chips.length > 0 ? (
              <View style={styles.chipRow}>
                {chips.map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text style={styles.chipText}>{c}</Text>
                  </View>
                ))}
              </View>
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
                  <Text style={styles.resumoNum}>{stats.nPedidos}</Text>
                  <Text style={styles.resumoLbl}>Pedidos</Text>
                </View>
                <View style={styles.resumoCell}>
                  <Text style={styles.resumoNum}>{stats.cozinheiros}</Text>
                  <Text style={styles.resumoLbl}>Cozinheiros</Text>
                </View>
                <View style={styles.resumoCell}>
                  <Text style={styles.resumoNum}>{stats.mediaLabel}</Text>
                  <Text style={styles.resumoLbl}>Média rec.</Text>
                </View>
              </View>
            )}
          </View>

          <Pressable
            onPress={() =>
              tap(() =>
                Alert.alert('NutriSync', 'Em breve você poderá editar seu perfil e restrições por aqui.'),
              )
            }
            style={({ pressed }) => [styles.card, styles.cardRow, pressed && styles.pressed]}>
            <Text style={styles.cardRowText}>Editar perfil e restrições</Text>
            <Text style={styles.cardArrow}>→</Text>
          </Pressable>
          <Pressable
            onPress={() => tap(() => router.push('/(user)/receitas-enviadas'))}
            style={({ pressed }) => [styles.card, styles.cardRow, pressed && styles.pressed]}>
            <Text style={styles.cardRowText}>Minhas receitas enviadas</Text>
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
          <Pressable onPress={() => tap(() => router.replace('/(user)/home'))} style={styles.bnavItem}>
            <MaterialIcons name="home" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Início</Text>
          </Pressable>
          <Pressable
            onPress={() => tap(() => router.push('/(user)/marketplace'))}
            style={styles.bnavItem}>
            <MaterialIcons name="search" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Buscar</Text>
          </Pressable>
          <Pressable onPress={() => tap(() => router.push('/(user)/meus-pedidos'))} style={styles.bnavItem}>
            <MaterialIcons name="receipt-long" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Pedidos</Text>
          </Pressable>
          <View style={styles.bnavItem}>
            <MaterialIcons name="person-outline" size={20} color={P.green} />
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
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: P.greenD,
  },
  heroName: {
    fontFamily: fontSerif,
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 12,
    color: P.textL,
    marginTop: 6,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },
  chip: {
    backgroundColor: P.greenL,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: P.greenD,
  },
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
  cardResumo: {
    paddingVertical: 16,
  },
  centerPad: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  resumoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  resumoCell: {
    flex: 1,
    alignItems: 'center',
  },
  resumoNum: {
    fontSize: 20,
    fontWeight: '700',
    color: P.greenD,
  },
  resumoLbl: {
    fontSize: 11,
    color: P.textL,
    marginTop: 4,
  },
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
  cardArrow: {
    fontSize: 16,
    color: P.textL,
  },
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
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
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
  bnavLabelOn: {
    color: P.green,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});

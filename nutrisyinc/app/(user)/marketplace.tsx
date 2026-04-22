/**
 * Cliente — Marketplace de cozinheiros (port de `web-prototype/cozinheiros.html`).
 *
 * Fonte de dados: tenta `GET /api/cozinheiros` (via `fetchCozinheirosApi`);
 * se o endpoint ainda não estiver disponível ou devolver shape inesperado,
 * exibe um estado informativo com o botão "Tentar de novo" — sem mock.
 *
 * Filtros:
 * - Busca textual local (nome, especialidade, bairro/cidade) com debounce
 *   de 250ms.
 * - Chips de especialidade carregados de `GET /api/especialidades` (fallback
 *   para lista fixa se a chamada falhar).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Routes } from '@/constants/routes';
import { fontSerif, P, radius } from '@/constants/prototypeTheme';
import {
  fetchCozinheirosApi,
  fetchEspecialidadesApi,
  type CozinheiroListJson,
  type EspecialidadeJson,
} from '@/lib/api';
import { formatDistanciaKm } from '@/lib/entrega';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCep(cep: string): string {
  const digits = cep.replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return cep;
}

function formatLocation(c: CozinheiroListJson): string {
  const rua = typeof c.rua === 'string' ? c.rua.trim() : '';
  if (rua) return rua;
  const bairroCidade = [c.bairro, c.cidade ?? c.localidade]
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(', ');
  if (bairroCidade) return bairroCidade;
  const cep = typeof c.localizacao === 'string' ? c.localizacao.trim() : '';
  return cep ? `CEP ${formatCep(cep)}` : '';
}

function splitEspecialidades(c: CozinheiroListJson): string[] {
  const out: string[] = [];
  if (c.especialidade && c.especialidade.trim()) out.push(c.especialidade.trim());
  if (Array.isArray(c.especialidades)) {
    for (const e of c.especialidades) {
      if (typeof e === 'string' && e.trim() && !out.includes(e.trim())) {
        out.push(e.trim());
      }
    }
  }
  return out;
}

function ratingValue(c: CozinheiroListJson): number | null {
  const candidates = [c.avaliacao, c.nota];
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

function ratingLabel(c: CozinheiroListJson): string {
  const v = ratingValue(c);
  if (v == null) return '—';
  const total = c.total_avaliacoes ?? 0;
  return total > 0 ? `★ ${v.toFixed(1)} (${total})` : `★ ${v.toFixed(1)}`;
}

function priceLabel(c: CozinheiroListJson): string {
  if (typeof c.preco_medio !== 'number' || !Number.isFinite(c.preco_medio) || c.preco_medio <= 0) {
    return '—';
  }
  return `${formatBrl(c.preco_medio)}/uni`;
}

function aboutText(c: CozinheiroListJson): string | null {
  const candidates = [c.sobre, c.sobre_voce];
  for (const v of candidates) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

function haystack(c: CozinheiroListJson): string {
  return [
    c.nome,
    c.especialidade,
    c.rua,
    c.bairro,
    c.cidade,
    c.localidade,
    c.localizacao,
    ...(Array.isArray(c.especialidades) ? c.especialidades : []),
  ]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();
}

/** Fallback de chips caso `/api/especialidades` falhe ou esteja ausente. */
const FALLBACK_CHIPS = ['Low carb', 'Hipertrofia', 'Vegano', 'Sem glúten', 'Emagrecimento'];

export default function MarketplaceScreen() {
  const router = useRouter();
  const [cooks, setCooks] = useState<CozinheiroListJson[]>([]);
  const [especialidades, setEspecialidades] = useState<EspecialidadeJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterName, setFilterName] = useState<string | null>(null);
  const [detail, setDetail] = useState<CozinheiroListJson | null>(null);

  const tap = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setErr(null);
    setRefreshing(true);
    const [cRes, eRes] = await Promise.all([
      fetchCozinheirosApi({ especialidade: filterName ?? undefined }),
      fetchEspecialidadesApi(),
    ]);
    if (cRes.ok) {
      setCooks(cRes.cozinheiros);
    } else {
      setCooks([]);
      setErr(cRes.error);
    }
    if (eRes.ok) setEspecialidades(eRes.especialidades);
    setLoading(false);
    setRefreshing(false);
  }, [filterName]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filteredCooks = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    if (!needle) return cooks;
    return cooks.filter((c) => haystack(c).includes(needle));
  }, [cooks, debouncedQuery]);

  const chips = especialidades.length > 0
    ? especialidades
    : FALLBACK_CHIPS.map((nome, i) => ({ id: -(i + 1), nome }));

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
            hitSlop={8}
            style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}>
            <Text style={styles.btnGhostText}>← Voltar</Text>
          </Pressable>
          <Text style={styles.topTitle}>Cozinheiros</Text>
          <View style={styles.topSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={16} color={P.textL} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nome, especialidade, bairro…"
            placeholderTextColor={P.textL}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clearBtn}>
              <MaterialIcons name="close" size={16} color={P.textL} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}>
          <Pressable
            onPress={() => tap(() => setFilterName(null))}
            style={({ pressed }) => [
              styles.chip,
              filterName == null && styles.chipOn,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.chipText, filterName == null && styles.chipTextOn]}>
              Todos
            </Text>
          </Pressable>
          {chips.map((chip) => {
            const active = filterName === chip.nome;
            return (
              <Pressable
                key={chip.nome}
                onPress={() => tap(() => setFilterName(active ? null : chip.nome))}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipOn,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.chipText, active && styles.chipTextOn]}>{chip.nome}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {err ? (
          <View style={styles.bannerErr}>
            <Text style={styles.bannerErrText}>{err}</Text>
            <Pressable onPress={load} style={styles.bannerRetry}>
              <Text style={styles.bannerRetryText}>Tentar de novo</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={P.green} size="large" />
          </View>
        ) : filteredCooks.length === 0 && !err ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>Nenhum cozinheiro encontrado</Text>
            <Text style={styles.emptyHint}>
              {query || filterName
                ? 'Tente ajustar a busca ou os filtros.'
                : 'Ainda não há cozinheiros cadastrados por aqui.'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredCooks.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => tap(() => setDetail(c))}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.cardImg}>
                  <Text style={styles.cardEmoji}>👩‍🍳</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {c.nome || 'Cozinheiro'}
                  </Text>
                  <Text style={styles.cardLoc} numberOfLines={1}>
                    {formatLocation(c) || '—'}
                  </Text>
                  {(() => {
                    const d = formatDistanciaKm(c.distancia_km ?? null);
                    return d ? <Text style={styles.cardDist}>{d}</Text> : null;
                  })()}
                  <View style={styles.tagsRow}>
                    {splitEspecialidades(c)
                      .slice(0, 2)
                      .map((t, i) => (
                        <View key={t} style={[styles.tag, i === 0 && styles.tagG]}>
                          <Text style={[styles.tagText, i === 0 && styles.tagTextG]}>{t}</Text>
                        </View>
                      ))}
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.stars}>{ratingLabel(c)}</Text>
                    <Text style={styles.priceLbl}>{priceLabel(c)}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        transparent
        visible={detail != null}
        animationType="fade"
        onRequestClose={() => setDetail(null)}>
        <Pressable style={styles.overlay} onPress={() => setDetail(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalEmoji}>👩‍🍳</Text>
            <Text style={styles.modalName}>{detail?.nome ?? '—'}</Text>
            <Text style={styles.modalSub}>
              {[
                formatLocation(detail ?? ({} as CozinheiroListJson)) || '—',
                ratingLabel(detail ?? ({} as CozinheiroListJson)),
                formatDistanciaKm(detail?.distancia_km ?? null),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {detail ? (
              <View style={styles.modalTagsRow}>
                {splitEspecialidades(detail).map((t) => (
                  <View key={t} style={styles.modalChip}>
                    <Text style={styles.modalChipText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {detail && aboutText(detail) ? (
              <View style={styles.aboutBox}>
                <Text style={styles.aboutLbl}>Sobre mim</Text>
                <Text style={styles.aboutBody}>{aboutText(detail)}</Text>
              </View>
            ) : null}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>
                  {detail
                    ? (() => {
                        const v = ratingValue(detail);
                        return v != null ? `${v.toFixed(1)}★` : '—';
                      })()
                    : '—'}
                </Text>
                <Text style={styles.statLbl}>nota</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum} numberOfLines={1}>
                  {detail?.tipo_entrega
                    ? detail.tipo_entrega === 'ambos'
                      ? 'Ambos'
                      : detail.tipo_entrega === 'delivery'
                        ? 'Delivery'
                        : detail.tipo_entrega === 'retirada'
                          ? 'Retirada'
                          : String(detail.tipo_entrega)
                    : '—'}
                </Text>
                <Text style={styles.statLbl}>entrega</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum} numberOfLines={1}>
                  {detail?.telefone ?? '—'}
                </Text>
                <Text style={styles.statLbl}>telefone</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
              onPress={() =>
                tap(() => {
                  setDetail(null);
                  Alert.alert(
                    'Em breve',
                    'Pedir para um cozinheiro específico estará disponível em breve. Por enquanto, envie sua receita na home.',
                  );
                })
              }>
              <Text style={styles.btnPrimaryText}>
                {detail ? `Escolher ${detail.nome?.split(' ')[0] ?? ''}`.trim() : 'Escolher'}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
              onPress={() => setDetail(null)}>
              <Text style={styles.btnSecondaryText}>Voltar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomNav}>
          <Pressable
            onPress={() => tap(() => router.replace('/(user)/home'))}
            style={styles.bnavItem}>
            <MaterialIcons name="home" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Início</Text>
          </Pressable>
          <View style={styles.bnavItem}>
            <MaterialIcons name="search" size={20} color={P.green} />
            <Text style={[styles.bnavLabel, styles.bnavLabelOn]}>Buscar</Text>
          </View>
          <Pressable
            onPress={() => tap(() => router.push('/(user)/meus-pedidos'))}
            style={styles.bnavItem}>
            <MaterialIcons name="receipt-long" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Pedidos</Text>
          </Pressable>
          <Pressable
            onPress={() => tap(() => router.push(Routes.userPerfil))}
            style={styles.bnavItem}>
            <MaterialIcons name="person-outline" size={20} color={P.textL} />
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  searchWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  searchIcon: { position: 'absolute', left: 11, top: 14, zIndex: 2 },
  clearBtn: { position: 'absolute', right: 10, top: 11, padding: 4, zIndex: 2 },
  searchInput: {
    width: '100%',
    paddingVertical: 10,
    paddingLeft: 36,
    paddingRight: 36,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    borderRadius: 10,
    fontSize: 14,
    backgroundColor: P.white,
    color: P.text,
  },
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
  centered: { paddingVertical: 32, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: P.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: P.textL, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  cardImg: {
    height: 110,
    backgroundColor: P.greenL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 42 },
  cardBody: { padding: 12 },
  cardName: { fontSize: 14, fontWeight: '600', color: P.text, marginBottom: 2 },
  cardLoc: { fontSize: 11, color: P.textL, marginBottom: 4 },
  cardDist: { fontSize: 11, color: P.greenD, marginBottom: 8, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 5,
    backgroundColor: P.beige,
  },
  tagG: { backgroundColor: P.greenL },
  tagText: { fontSize: 10, fontWeight: '500', color: P.textM },
  tagTextG: { color: P.greenD },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stars: { fontSize: 11, fontWeight: '600', color: P.brownBtn },
  priceLbl: { fontSize: 11, fontWeight: '600', color: P.greenD },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: P.white,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: P.beigeMid,
    marginBottom: 12,
  },
  modalEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 6 },
  modalName: { fontFamily: fontSerif, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalSub: { fontSize: 12, color: P.textL, textAlign: 'center', marginTop: 4, marginBottom: 12 },
  modalTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  modalChip: {
    backgroundColor: P.greenL,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  modalChipText: { fontSize: 11, fontWeight: '600', color: P.greenD },
  aboutBox: {
    backgroundColor: P.cream,
    borderRadius: radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: P.beigeD,
    marginBottom: 14,
  },
  aboutLbl: { fontSize: 11, fontWeight: '600', color: P.textM, marginBottom: 4 },
  aboutBody: { fontSize: 12, color: P.text, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: P.beige,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNum: { fontSize: 15, fontWeight: '700', color: P.greenD },
  statLbl: { fontSize: 11, color: P.textL, marginTop: 4 },
  btnPrimary: {
    width: '100%',
    backgroundColor: P.green,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnSecondary: {
    width: '100%',
    backgroundColor: P.white,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondaryText: { color: P.textM, fontSize: 13, fontWeight: '500' },
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
  },
  bnavItem: { alignItems: 'center', gap: 2, minWidth: 64 },
  bnavLabel: { fontSize: 10, fontWeight: '500', color: P.textL },
  bnavLabelOn: { color: P.green, fontWeight: '600' },
  pressed: { opacity: 0.88 },
});

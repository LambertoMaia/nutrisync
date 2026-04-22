/**
 * Cliente home — `web-prototype/home-user.html` (cozinheiros mock; user/pedidos via API).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/prototype/LogoMark';
import { useAuth } from '@/contexts/AuthContext';
import {
  deletePedidoClienteApi,
  deleteSolicitacaoApi,
  fetchClienteHomePedidosApi,
  fetchCozinheiroDetalhesApi,
  fetchPerfilClienteApi,
  putPedidoStatusApi,
  responderPropostaClienteApi,
  resolvePublicMediaUrl,
  type CozinheiroDetalhesJson,
  type CozinheiroListJson,
  type EntregaOpcaoId,
  type PedidoClienteAtivoJson,
  type SolicitacaoClienteJson,
} from '@/lib/api';
import { formatDistanciaKm, iconForEntregaOpcao, pedidoEntregaResumo } from '@/lib/entrega';
import { firstName, initialFromName } from '@/lib/name';
import { fontSerif, P, radius } from '@/constants/prototypeTheme';

const COOKS = [
  {
    id: '1',
    emoji: '👩‍🍳',
    name: 'Ana Paula',
    loc: '📍 Boa Viagem',
    tags: ['Low carb', 'Sem glúten'],
    stars: '★ 4.9 (38)',
    price: 'R$18/uni',
  },
  {
    id: '2',
    emoji: '👨‍🍳',
    name: 'Carlos Melo',
    loc: '📍 Casa Amarela',
    tags: ['Hipertrofia', 'Vegano'],
    stars: '★ 4.7 (21)',
    price: 'R$22/uni',
  },
] as const;

type MergedRow =
  | { kind: 'solicitacao'; item: SolicitacaoClienteJson }
  | { kind: 'pedido'; item: PedidoClienteAtivoJson };

type EntregaOpcao = { id: EntregaOpcaoId; label: string; taxa: number; estimativa?: boolean };

type PropostaModalState = {
  propostaId: number;
  cozinheiroId?: number;
  cozinheiroNome: string;
  baseValor: number;
  opcionesEntrega: EntregaOpcao[];
  selectedEntregaId: EntregaOpcaoId;
  /**
   * Tempo estimado de entrega em minutos que o cozinheiro prometeu na
   * proposta. Só faz sentido quando o cliente escolhe `motoboy` — o backend
   * só propaga o campo para `Pedido` nesse caso (ver PLAN §10.1).
   */
  tempoEntregaMin: number | null;
  /** Distância cliente ↔ cozinheiro em km (PLAN §10). `null` se geo ausente. */
  distanciaKm: number | null;
  tipoEntrega: string;
  cozinheiroEspecialidade: string;
  cozinheiroNota: number;
  cozinheiroRespostaTempo: string;
  cozinheiroSobre: string;
  tempoPreparoLabel: string;
  retiradaEndereco: string;
  entregaEnderecoCliente: string;
};

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

function tipoEntregaReadable(raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  const x = raw.trim().toLowerCase();
  if (x === 'delivery') return 'Entrega';
  if (x === 'retirada') return 'Retirada';
  if (x === 'ambos') return 'Retirada ou entrega';
  return raw.trim();
}

function mapPropostaExtras(p: {
  cozinheiro_especialidade?: string;
  cozinheiro_nota?: number;
  cozinheiro_resposta_tempo?: string;
  cozinheiro_sobre?: string;
  tempo_preparo_label?: string;
  retirada_endereco?: string;
  entrega_endereco_cliente?: string;
}) {
  return {
    cozinheiroEspecialidade: p.cozinheiro_especialidade ?? '',
    cozinheiroNota: p.cozinheiro_nota ?? 0,
    cozinheiroRespostaTempo: p.cozinheiro_resposta_tempo ?? '',
    cozinheiroSobre: p.cozinheiro_sobre ?? '',
    tempoPreparoLabel: p.tempo_preparo_label ?? '',
    retiradaEndereco: p.retirada_endereco ?? '',
    entregaEnderecoCliente: p.entrega_endereco_cliente ?? '',
  };
}

function formatPedidoBrl(n: number) {
  return n.toFixed(2).replace('.', ',');
}

const WIN_H = Dimensions.get('window').height;

function taxaResumoLinha(op: EntregaOpcao): string {
  if (op.estimativa && op.taxa > 0) {
    return `Estimativa + R$ ${op.taxa.toFixed(2)}`;
  }
  if (op.taxa <= 0) return 'Sem taxa';
  return `+ R$ ${op.taxa.toFixed(2)}`;
}

function statusBadgeLabel(status: string): string {
  const m: Record<string, string> = {
    pendente: 'Pendente',
    confirmado: 'Confirmado',
    preparando: 'Em preparo',
    preparo: 'Em preparo',
    saiu_entrega: 'Saiu para entrega',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  };
  return m[status] ?? status;
}

export default function HomeUserScreen() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.nome ?? '');
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoClienteJson[]>([]);
  const [pedidos, setPedidos] = useState<PedidoClienteAtivoJson[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [propostaModal, setPropostaModal] = useState<PropostaModalState | null>(null);
  const [propostaCookDetalhe, setPropostaCookDetalhe] = useState<CozinheiroDetalhesJson | null>(null);
  const [propostaCookDetalheLoading, setPropostaCookDetalheLoading] = useState(false);
  const [deliveryPickerOpen, setDeliveryPickerOpen] = useState(false);

  const tap = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  const goLanding = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.tipo !== 'cliente') {
      router.replace('/(tabs)');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (propostaModal == null) setDeliveryPickerOpen(false);
  }, [propostaModal]);

  useEffect(() => {
    if (propostaModal == null) {
      setPropostaCookDetalhe(null);
      setPropostaCookDetalheLoading(false);
      return;
    }
    const cid = propostaModal.cozinheiroId;
    if (cid == null) {
      setPropostaCookDetalhe(null);
      setPropostaCookDetalheLoading(false);
      return;
    }
    let cancelled = false;
    setPropostaCookDetalhe(null);
    setPropostaCookDetalheLoading(true);
    void (async () => {
      const res = await fetchCozinheiroDetalhesApi(cid);
      if (cancelled) return;
      setPropostaCookDetalheLoading(false);
      if (res.ok) setPropostaCookDetalhe(res.cozinheiro);
      else setPropostaCookDetalhe(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [propostaModal?.propostaId, propostaModal?.cozinheiroId]);

  const loadPerfil = useCallback(async () => {
    const res = await fetchPerfilClienteApi();
    if (res.ok) {
      setDisplayName(res.data.nome);
    } else if (user?.nome) {
      setDisplayName(user.nome);
    }
  }, [user?.nome]);

  const loadHomePedidos = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setPedidosLoading(true);
      try {
        const res = await fetchClienteHomePedidosApi();
        if (res.ok) {
          setSolicitacoes(res.solicitacoes);
          setPedidos(res.pedidos);
        } else if (!opts.silent) {
          setSolicitacoes([]);
          setPedidos([]);
        }
      } catch {
        if (!opts.silent) {
          setSolicitacoes([]);
          setPedidos([]);
        }
      } finally {
        if (!opts.silent) setPedidosLoading(false);
      }
    },
    [],
  );

  const mergedRows = useMemo(() => {
    type Row =
      | { kind: 'solicitacao'; item: SolicitacaoClienteJson }
      | { kind: 'pedido'; item: PedidoClienteAtivoJson };
    const sol: Row[] = solicitacoes.map((s) => ({ kind: 'solicitacao', item: s }));
    const ped: Row[] = pedidos.map((p) => ({ kind: 'pedido', item: p }));
    const all = [...sol, ...ped];
    all.sort((a, b) => {
      const ia = a.kind === 'solicitacao' ? a.item.criado_em_iso : a.item.criado_em_iso;
      const ib = b.kind === 'solicitacao' ? b.item.criado_em_iso : b.item.criado_em_iso;
      return (ib || '').localeCompare(ia || '');
    });
    return all;
  }, [solicitacoes, pedidos]);

  const pollPausedRef = useRef(false);
  useEffect(() => {
    pollPausedRef.current = propostaModal != null;
  }, [propostaModal]);

  useFocusEffect(
    useCallback(() => {
      if (!user || user.tipo !== 'cliente') return;
      let active = true;
      void (async () => {
        await loadPerfil();
        if (!active) return;
        await loadHomePedidos();
      })();
      /**
       * Polling silencioso a cada 15s para refletir mudanças feitas por
       * outro lado (cozinheiro enviou proposta, mudou status do pedido,
       * etc.) sem o usuário precisar trocar de aba ou relogar. Pausa quando
       * um modal bloqueante está aberto para não atropelar a interação.
       */
      const POLL_MS = 15000;
      const timer = setInterval(() => {
        if (!active || pollPausedRef.current) return;
        void loadHomePedidos({ silent: true });
      }, POLL_MS);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [user, loadPerfil, loadHomePedidos]),
  );

  const abrirModalProposta = useCallback(
    (s: SolicitacaoClienteJson) => {
      const p = s.proposta_pendente;
      if (!p) return;
      const opciones = p.opciones_entrega ?? [];
      setPropostaModal({
        propostaId: p.id,
        cozinheiroId: p.cozinheiro_id,
        cozinheiroNome: p.cozinheiro_nome,
        baseValor: p.base_valor ?? p.valor,
        opcionesEntrega: opciones,
        selectedEntregaId: opciones[0]?.id ?? 'retirada',
        tempoEntregaMin: p.tempo_entrega_min ?? null,
        distanciaKm: p.distancia_km ?? null,
        tipoEntrega: p.tipo_entrega,
        ...mapPropostaExtras(p),
      });
    },
    [],
  );

  const propostaModalTotal = useMemo(() => {
    if (!propostaModal) return 0;
    if (propostaModal.opcionesEntrega.length === 0) return propostaModal.baseValor;
    const taxa =
      propostaModal.opcionesEntrega.find((o) => o.id === propostaModal.selectedEntregaId)?.taxa ?? 0;
    return propostaModal.baseValor + taxa;
  }, [propostaModal]);

  const propostaModalTaxa = useMemo(() => {
    if (!propostaModal || propostaModal.opcionesEntrega.length === 0) return 0;
    return propostaModal.opcionesEntrega.find((o) => o.id === propostaModal.selectedEntregaId)?.taxa ?? 0;
  }, [propostaModal]);

  const propostaModalEntregaOp = useMemo(() => {
    if (!propostaModal || propostaModal.opcionesEntrega.length === 0) return undefined;
    return propostaModal.opcionesEntrega.find((o) => o.id === propostaModal.selectedEntregaId);
  }, [propostaModal]);

  const propostaModalLocalEntrega = useMemo(() => {
    if (!propostaModal) return '';
    if (propostaModal.opcionesEntrega.length === 0) return propostaModal.tipoEntrega;
    if (propostaModal.selectedEntregaId === 'retirada') {
      return propostaModal.retiradaEndereco
        ? `Retirada no local · ${propostaModal.retiradaEndereco}`
        : 'Retirada no local (endereço enviado por mensagem após o aceite)';
    }
    if (propostaModal.entregaEnderecoCliente) {
      return `Entrega no endereço · ${propostaModal.entregaEnderecoCliente}`;
    }
    return 'Entrega no endereço cadastrado na sua conta';
  }, [propostaModal]);

  const responderProposta = useCallback(
    async (aceitar: boolean) => {
      if (!propostaModal) return;
      const r = await responderPropostaClienteApi(
        propostaModal.propostaId,
        aceitar,
        aceitar && propostaModal.opcionesEntrega.length > 0
          ? { entregaOpcao: propostaModal.selectedEntregaId }
          : undefined,
      );
      setPropostaModal(null);
      if (r.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (aceitar && r.pedidoId != null) {
          // Checkout fake (PLAN_USUARIO §12): o pedido já foi criado com
          // `status_pagamento = pendente`; levamos o cliente direto para
          // a tela de pagamento. O `replace` evita empilhar a home.
          router.push({ pathname: '/(user)/checkout/[id]', params: { id: String(r.pedidoId) } });
        } else {
          await loadHomePedidos();
        }
      } else {
        Alert.alert('Pedido', r.error);
      }
    },
    [propostaModal, loadHomePedidos, router],
  );

  const removerRow = useCallback(
    (row: MergedRow) => {
      Alert.alert('Remover', 'Deseja remover este item da lista?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              if (row.kind === 'solicitacao') {
                const r = await deleteSolicitacaoApi(row.item.id);
                if (!r.ok) Alert.alert('Erro', r.error);
              } else {
                const r = await deletePedidoClienteApi(row.item.id);
                if (!r.ok) Alert.alert('Erro', r.error);
              }
              await loadHomePedidos();
            })(),
        },
      ]);
    },
    [loadHomePedidos],
  );

  const [confirmingEntregaId, setConfirmingEntregaId] = useState<number | null>(null);
  const confirmarEntrega = useCallback(
    (pedidoId: number) => {
      Alert.alert(
        'Confirmar entrega',
        'Você recebeu o pedido?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: () =>
              void (async () => {
                setConfirmingEntregaId(pedidoId);
                const r = await putPedidoStatusApi(pedidoId, 'entregue');
                setConfirmingEntregaId(null);
                if (!r.ok) {
                  Alert.alert('Não deu pra confirmar', r.error);
                  return;
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await loadHomePedidos();
              })(),
          },
        ],
      );
    },
    [loadHomePedidos],
  );

  const onLogout = useCallback(async () => {
    setMenuOpen(false);
    await logout();
    router.replace('/(tabs)');
  }, [logout, router]);

  const greet = firstName(displayName || user?.nome || '');
  const initial = initialFromName(displayName || user?.nome || '');

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
              onPress={() =>
                tap(() => {
                  setMenuOpen(false);
                  router.push('/(user)/perfil');
                })
              }>
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

      <Modal
        visible={propostaModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeliveryPickerOpen(false);
          setPropostaModal(null);
        }}>
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => {
            setDeliveryPickerOpen(false);
            setPropostaModal(null);
          }}>
          <Pressable style={styles.propostaCardWrap} onPress={(e) => e.stopPropagation()}>
            <ScrollView
              style={styles.propostaCardScroll}
              contentContainerStyle={styles.propostaCardScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.propostaCard}>
                <Text style={styles.propostaTitle}>Proposta recebida</Text>
                {propostaModal ? (
                  <>
                    <View style={styles.propostaCookCard}>
                      {propostaCookDetalheLoading && propostaModal.cozinheiroId != null ? (
                        <ActivityIndicator color={P.green} style={{ marginBottom: 10 }} />
                      ) : null}
                      {(() => {
                        const ck = propostaCookDetalhe;
                        const ratingSrc: CozinheiroListJson =
                          ck ??
                          ({
                            avaliacao: propostaModal.cozinheiroNota,
                            nota: propostaModal.cozinheiroNota,
                          } as CozinheiroListJson);
                        const nome =
                          (ck?.nome && ck.nome.trim()) || propostaModal.cozinheiroNome;
                        const esp =
                          (ck?.especialidade && ck.especialidade.trim()) ||
                          ck?.marmitas?.[0]?.nome ||
                          propostaModal.cozinheiroEspecialidade ||
                          '';
                        const sobre =
                          (ck?.sobre && ck.sobre.trim()) ||
                          (ck?.sobre_voce && ck.sobre_voce.trim()) ||
                          propostaModal.cozinheiroSobre ||
                          '';
                        const fotoUri = resolvePublicMediaUrl(ck?.foto ?? null);
                        const loc = ck ? formatLocation(ck) : '';
                        const dist = formatDistanciaKm(propostaModal.distanciaKm);
                        const tipoLinha = [
                          tipoEntregaReadable(ck?.tipo_entrega ?? propostaModal.tipoEntrega),
                          loc,
                          dist,
                        ]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <>
                            <View style={styles.propostaCookHeadRow}>
                              {fotoUri ? (
                                <Image
                                  source={{ uri: fotoUri }}
                                  style={styles.propostaCookAvatar}
                                  contentFit="cover"
                                />
                              ) : (
                                <Text style={styles.propostaCookEmoji}>👨‍🍳</Text>
                              )}
                              <View style={styles.propostaCookHeadCol}>
                                <View style={styles.propostaCookHead}>
                                  <Text style={styles.propostaCookName}>{nome}</Text>
                                  {ratingLabel(ratingSrc) !== '—' ? (
                                    <Text style={styles.propostaCookStars}>{ratingLabel(ratingSrc)}</Text>
                                  ) : null}
                                </View>
                                {esp ? <Text style={styles.propostaCookTag}>{esp}</Text> : null}
                              </View>
                            </View>
                            {sobre ? (
                              <Text style={styles.propostaCookBio} numberOfLines={3}>
                                {sobre}
                              </Text>
                            ) : null}
                            {propostaModal.cozinheiroRespostaTempo ? (
                              <Text style={styles.propostaCookMeta}>{propostaModal.cozinheiroRespostaTempo}</Text>
                            ) : null}
                            {propostaModal.tempoPreparoLabel ? (
                              <Text style={styles.propostaCookPrep}>{propostaModal.tempoPreparoLabel}</Text>
                            ) : null}
                            {tipoLinha ? (
                              <Text style={styles.propostaCookLocLine} numberOfLines={2}>
                                {tipoLinha}
                              </Text>
                            ) : null}
                            <Text style={styles.propostaCookCta}>
                              {nome.split(' ')[0] ?? nome} aceitou preparar com base na sua receita e nas observações que você
                              enviou.
                            </Text>
                          </>
                        );
                      })()}
                    </View>
                    {propostaModal.opcionesEntrega.length > 0 ? (
                      <>
                        <Pressable
                          style={({ pressed }) => [styles.entregaPickerTrigger, pressed && styles.pressed]}
                          onPress={() => tap(() => setDeliveryPickerOpen(true))}>
                          <View style={styles.entregaPickerIconWrap}>
                            <MaterialIcons
                              name={iconForEntregaOpcao(propostaModal.selectedEntregaId)}
                              size={22}
                              color={P.greenD}
                            />
                          </View>
                          <View style={styles.entregaPickerTriggerText}>
                            <Text style={styles.entregaPickerTriggerKicker}>Forma de entrega</Text>
                            <Text style={styles.entregaPickerTriggerValue} numberOfLines={2}>
                              {propostaModalEntregaOp
                                ? `${propostaModalEntregaOp.label} · ${taxaResumoLinha(propostaModalEntregaOp)}`
                                : 'Toque para escolher'}
                            </Text>
                          </View>
                          <MaterialIcons name="chevron-right" size={22} color={P.textL} />
                        </Pressable>
                        <View style={styles.propostaResumo}>
                          <Text style={styles.propostaResumoLine}>
                            Valor do plano: R$ {propostaModal.baseValor.toFixed(2)}
                          </Text>
                          <Text style={styles.propostaResumoLine}>
                            {propostaModalEntregaOp?.estimativa && propostaModalTaxa > 0
                              ? `Estimativa de entrega (Uber): R$ ${propostaModalTaxa.toFixed(2)}`
                              : propostaModalTaxa <= 0
                                ? 'Taxa de entrega: sem custo'
                                : `Taxa de entrega: R$ ${propostaModalTaxa.toFixed(2)}`}
                          </Text>
                          {propostaModal.selectedEntregaId === 'motoboy' &&
                          propostaModal.tempoEntregaMin != null ? (
                            <Text style={styles.propostaResumoLine}>
                              Tempo estimado de entrega: ~{propostaModal.tempoEntregaMin} min
                            </Text>
                          ) : null}
                          <Text style={styles.propostaTotalPagar}>
                            Total a pagar: R$ {propostaModalTotal.toFixed(2)}
                          </Text>
                          <Text style={styles.propostaLocalTitulo}>Local do pedido</Text>
                          <Text style={styles.propostaLocalText}>{propostaModalLocalEntrega}</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.propostaValor}>Valor: R$ {propostaModal.baseValor.toFixed(2)}</Text>
                        <Text style={styles.propostaEntrega}>Entrega: {propostaModal.tipoEntrega}</Text>
                      </>
                    )}
                    <View style={styles.propostaActions}>
                      <Pressable
                        style={({ pressed }) => [styles.propostaBtn, styles.propostaBtnOutline, pressed && styles.pressed]}
                        onPress={() => tap(() => void responderProposta(false))}>
                        <Text style={styles.propostaBtnOutlineText}>Recusar</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.propostaBtn, styles.propostaBtnPrimary, pressed && styles.pressed]}
                        onPress={() => tap(() => void responderProposta(true))}>
                        <Text style={styles.propostaBtnPrimaryText}>Aceitar</Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={deliveryPickerOpen && propostaModal != null}
        transparent
        animationType="slide"
        onRequestClose={() => setDeliveryPickerOpen(false)}>
        <View style={styles.deliveryModalFill}>
          <View style={styles.deliverySheetRoot}>
            <Pressable style={styles.deliverySheetBackdrop} onPress={() => setDeliveryPickerOpen(false)} />
            <SafeAreaView edges={['bottom']} style={styles.deliverySheetCard}>
            <View style={styles.deliverySheetHandle} />
            <Text style={styles.deliverySheetTitle}>Forma de entrega</Text>
            <Text style={styles.deliverySheetSub}>
              Escolha como prefere receber. Retirada no local não tem taxa de entrega.
            </Text>
            <ScrollView
              style={styles.deliverySheetScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {propostaModal?.opcionesEntrega.map((op) => {
                const sel = propostaModal.selectedEntregaId === op.id;
                return (
                  <Pressable
                    key={op.id}
                    style={({ pressed }) => [
                      styles.deliveryOptionCard,
                      sel && styles.deliveryOptionCardOn,
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      tap(() => {
                        setPropostaModal((m) => (m ? { ...m, selectedEntregaId: op.id } : m));
                        setDeliveryPickerOpen(false);
                      })
                    }>
                    <View style={[styles.deliveryOptionIconCircle, sel && styles.deliveryOptionIconCircleOn]}>
                      <MaterialIcons
                        name={iconForEntregaOpcao(op.id)}
                        size={26}
                        color={sel ? P.greenD : P.textM}
                      />
                    </View>
                    <View style={styles.deliveryOptionBody}>
                      <Text style={styles.deliveryOptionTitle}>{op.label}</Text>
                      <Text style={styles.deliveryOptionSub}>
                        {op.estimativa && op.taxa > 0
                          ? `Estimativa Uber: + R$ ${op.taxa.toFixed(2)} (taxa estimada)`
                          : op.taxa <= 0
                            ? 'Sem taxa de entrega'
                            : `Taxa de entrega: + R$ ${op.taxa.toFixed(2)}`}
                      </Text>
                      {op.id === 'motoboy' && propostaModal?.tempoEntregaMin != null ? (
                        <Text style={styles.deliveryOptionSub}>
                          Tempo estimado: ~{propostaModal.tempoEntregaMin} min
                        </Text>
                      ) : null}
                    </View>
                    {sel ? (
                      <MaterialIcons name="check-circle" size={24} color={P.green} />
                    ) : (
                      <MaterialIcons name="radio-button-unchecked" size={24} color={P.beigeMid} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={({ pressed }) => [styles.deliverySheetCloseBtn, pressed && styles.pressed]}
              onPress={() => tap(() => setDeliveryPickerOpen(false))}>
              <Text style={styles.deliverySheetCloseBtnText}>Fechar</Text>
            </Pressable>
          </SafeAreaView>
          </View>
        </View>
      </Modal>

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topnav}>
          <LogoMark onPress={goLanding} />
          <Pressable
            onPress={() => tap(() => setMenuOpen(true))}
            style={({ pressed }) => [styles.avatarTop, pressed && styles.pressed]}>
            <Text style={styles.avatarTopText}>{initial}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.greetRow}>
            <Pressable onPress={() => tap(() => setMenuOpen(true))} style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>{initial}</Text>
            </Pressable>
            <View>
              <Text style={styles.greetName}>
                Olá, {greet || '—'} 👋
              </Text>
              <Text style={styles.greetSub}>O que vamos comer essa semana?</Text>
            </View>
          </View>

          <View style={styles.ctaMain}>
            <Text style={styles.ctaKicker}>Novo pedido</Text>
            <Text style={styles.ctaTitle}>Enviar minha receita</Text>
            <Text style={styles.ctaDesc}>Foto ou formulário — cozinheiros recebem na hora</Text>
            <Pressable
              onPress={() => tap(() => router.push('/enviar-receita'))}
              style={({ pressed }) => [styles.ctaPill, pressed && styles.pressed]}>
              <Text style={styles.ctaPillText}>Enviar agora →</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => tap(() => {})}
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}>
            <Text style={styles.btnSecondaryText}>Sem receita — ver cardápios sugeridos</Text>
          </Pressable>

          <Text style={styles.blockTitle}>Pedidos em andamento</Text>
          {pedidosLoading ? (
            <View style={styles.pedidoLoading}>
              <ActivityIndicator color={P.green} />
            </View>
          ) : mergedRows.length === 0 ? (
            <Text style={styles.pedidoEmpty}>Nenhum pedido em andamento.</Text>
          ) : (
            mergedRows.map((row) =>
              row.kind === 'solicitacao' ? (
                row.item.proposta_pendente ? (
                  <Pressable
                    key={`s-${row.item.id}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      abrirModalProposta(row.item);
                    }}
                    style={({ pressed }) => [styles.pedidoCard, pressed && styles.pressed]}>
                    <View style={styles.pedidoHead}>
                      <View style={styles.pedidoHeadText}>
                        <View style={styles.solicHeadTitleRow}>
                          <Text style={styles.pedidoId} numberOfLines={2}>
                            Solicitação #{String(row.item.id).padStart(4, '0')} · {row.item.data} · {row.item.hora}
                          </Text>
                          <View style={styles.badgePropostaRec}>
                            <Text style={styles.badgePropostaRecText}>Proposta recebida</Text>
                          </View>
                          <MaterialIcons name="chevron-right" size={20} color={P.textL} />
                        </View>
                        <Text style={styles.pedidoUser}>
                          Proposta de {row.item.proposta_pendente.cozinheiro_nome} — R${' '}
                          {row.item.proposta_pendente.valor.toFixed(2)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => tap(() => removerRow(row))}
                        hitSlop={8}
                        style={styles.removeIcon}>
                        <MaterialIcons name="close" size={22} color={P.textL} />
                      </Pressable>
                    </View>
                  </Pressable>
                ) : (
                  <View key={`s-${row.item.id}`} style={styles.pedidoCard}>
                    <View style={styles.pedidoHead}>
                      <View style={styles.pedidoHeadText}>
                        <Text style={styles.pedidoId}>
                          Solicitação #{String(row.item.id).padStart(4, '0')} · {row.item.data} · {row.item.hora}
                        </Text>
                        {row.item.situacao === 'aguardando_cozinheiro' && (
                          <Text style={styles.pedidoUser}>Aguardando um cozinheiro aceitar…</Text>
                        )}
                        {row.item.situacao === 'recusada_cliente' && (
                          <Text style={styles.pedidoMuted}>
                            Você recusou a proposta. Esta solicitação foi encerrada.
                          </Text>
                        )}
                      </View>
                      <Pressable
                        onPress={() => tap(() => removerRow(row))}
                        hitSlop={8}
                        style={styles.removeIcon}>
                        <MaterialIcons name="close" size={22} color={P.textL} />
                      </Pressable>
                    </View>
                  </View>
                )
              ) : (
                <View key={`p-${row.item.id}`} style={styles.pedidoCard}>
                  <View style={styles.pedidoHead}>
                    <Pressable
                      onPress={() => tap(() => {
                        if (row.item.status_pagamento === 'pendente') {
                          router.push({
                            pathname: '/(user)/checkout/[id]',
                            params: { id: String(row.item.id) },
                          });
                        }
                      })}
                      style={({ pressed }) => [styles.pedidoHeadMain, pressed && styles.pressed]}>
                      <View>
                        <Text style={styles.pedidoId}>
                          Pedido #{String(row.item.id).padStart(4, '0')} · {row.item.data}
                        </Text>
                        <Text style={styles.pedidoUser}>{row.item.cozinheiro_nome}</Text>
                      </View>
                      <View
                        style={[
                          styles.badgePrep,
                          row.item.status === 'saiu_entrega' && styles.badgeDelivery,
                        ]}>
                        <Text
                          style={[
                            styles.badgePrepText,
                            row.item.status === 'saiu_entrega' && styles.badgeDeliveryText,
                          ]}>
                          {statusBadgeLabel(row.item.status)}
                        </Text>
                      </View>
                    </Pressable>
                    {row.item.status === 'preparando' || row.item.status === 'saiu_entrega' ? null : (
                      <Pressable
                        onPress={() => tap(() => removerRow(row))}
                        hitSlop={8}
                        style={styles.removeIcon}>
                        <MaterialIcons name="close" size={22} color={P.textL} />
                      </Pressable>
                    )}
                  </View>
                  {row.item.status_pagamento === 'pendente' ? (
                    <Pressable
                      onPress={() =>
                        tap(() =>
                          router.push({
                            pathname: '/(user)/checkout/[id]',
                            params: { id: String(row.item.id) },
                          }),
                        )
                      }
                      style={({ pressed }) => [styles.payCta, pressed && styles.pressed]}>
                      <MaterialIcons name="payments" size={16} color="#7a4f00" />
                      <Text style={styles.payCtaText}>Pagamento pendente — finalizar</Text>
                      <MaterialIcons name="chevron-right" size={18} color="#7a4f00" />
                    </Pressable>
                  ) : null}
                  <Text style={styles.pedidoFoot}>
                    {row.item.qtd_marmitas} marmitas · Total R$ {formatPedidoBrl(row.item.valor_total)} ·{' '}
                    {row.item.hora}
                  </Text>
                  {(() => {
                    const entregaLinha = pedidoEntregaResumo(row.item);
                    return entregaLinha ? (
                      <View style={styles.pedidoEntregaRow}>
                        <MaterialIcons
                          name={iconForEntregaOpcao(row.item.entrega_opcao ?? 'retirada')}
                          size={14}
                          color={P.textM}
                        />
                        <Text style={styles.pedidoEntregaText}>{entregaLinha}</Text>
                      </View>
                    ) : null;
                  })()}
                  {row.item.status === 'saiu_entrega' && (
                    <Pressable
                      disabled={confirmingEntregaId === row.item.id}
                      onPress={() => tap(() => confirmarEntrega(row.item.id))}
                      style={({ pressed }) => [
                        styles.confirmarEntregaBtn,
                        pressed && styles.pressed,
                        confirmingEntregaId === row.item.id && styles.disabled,
                      ]}>
                      {confirmingEntregaId === row.item.id ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.confirmarEntregaBtnText}>
                          Confirmar entrega
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              ),
            )
          )}

          <Text style={[styles.blockTitle, styles.blockTitleSpaced]}>Cozinheiros próximos</Text>
          <View style={styles.cookGrid}>
            {COOKS.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => tap(() => {})}
                style={({ pressed }) => [styles.cookCard, pressed && styles.pressed]}>
                <Text style={styles.cookEmoji}>{c.emoji}</Text>
                <View style={styles.cookBody}>
                  <Text style={styles.cookName}>{c.name}</Text>
                  <Text style={styles.cookLoc}>{c.loc}</Text>
                  <View style={styles.tagRow}>
                    {c.tags.map((t) => (
                      <View key={t} style={[styles.tag, t === c.tags[0] && styles.tagG]}>
                        <Text style={[styles.tagText, t === c.tags[0] && styles.tagTextG]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.cookFooter}>
                    <Text style={styles.stars}>{c.stars}</Text>
                    <Text style={styles.priceLbl}>{c.price}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomNav}>
          <View style={styles.bnavItem}>
            <MaterialIcons name="home" size={20} color={P.green} />
            <Text style={[styles.bnavLabel, styles.bnavLabelOn]}>Início</Text>
          </View>
          <Pressable
            onPress={() => tap(() => router.push('/(user)/marketplace'))}
            style={styles.bnavItem}>
            <MaterialIcons name="search" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Buscar</Text>
          </Pressable>
          <Pressable
            onPress={() => tap(() => router.push('/(user)/meus-pedidos'))}
            style={styles.bnavItem}>
            <MaterialIcons name="receipt-long" size={20} color={P.textL} />
            <Text style={styles.bnavLabel}>Pedidos</Text>
          </Pressable>
          <Pressable
            onPress={() => tap(() => router.push('/(user)/perfil'))}
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
  loadingRoot: {
    flex: 1,
    backgroundColor: P.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    flex: 1,
    backgroundColor: P.beige,
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
    fontSize: 11,
    fontWeight: '700',
    color: P.textL,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuRowText: {
    fontSize: 15,
    color: P.text,
    fontWeight: '500',
  },
  safeTop: {
    backgroundColor: P.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.beigeD,
  },
  topnav: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarTop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: P.greenL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: P.beigeMid,
  },
  avatarTopText: {
    fontSize: 14,
    fontWeight: '700',
    color: P.greenD,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  section: {
    paddingHorizontal: 18,
    paddingTop: 16,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 20,
  },
  avatarLg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: P.greenL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: P.beigeMid,
  },
  avatarLgText: {
    fontSize: 17,
    fontWeight: '700',
    color: P.greenD,
  },
  greetName: {
    fontFamily: fontSerif,
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
  },
  greetSub: {
    fontSize: 12,
    color: P.textL,
    marginTop: 2,
  },
  ctaMain: {
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 9,
    backgroundColor: P.greenD,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  ctaKicker: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  ctaTitle: {
    fontFamily: fontSerif,
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  ctaDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 14,
    lineHeight: 18,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 8,
  },
  ctaPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  btnSecondary: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    backgroundColor: P.white,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.brownBtn,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: P.text,
    marginBottom: 10,
  },
  blockTitleSpaced: {
    marginTop: 8,
    marginBottom: 10,
  },
  pedidoLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  pedidoEmpty: {
    fontSize: 13,
    color: P.textL,
    marginBottom: 18,
  },
  pedidoCard: {
    backgroundColor: P.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.beigeD,
    padding: 14,
    marginBottom: 12,
  },
  pedidoHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pedidoId: {
    fontSize: 13,
    fontWeight: '600',
    color: P.text,
  },
  pedidoUser: {
    fontSize: 12,
    color: P.textL,
    marginTop: 2,
  },
  pedidoHeadText: {
    flex: 1,
    paddingRight: 8,
  },
  solicHeadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badgePropostaRec: {
    backgroundColor: P.greenL,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgePropostaRecText: {
    fontSize: 11,
    fontWeight: '700',
    color: P.greenD,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pedidoHeadMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginRight: 4,
  },
  pedidoMuted: {
    fontSize: 12,
    color: P.textL,
    fontStyle: 'italic',
    marginTop: 4,
  },
  removeIcon: {
    padding: 4,
  },
  propostaCardWrap: {
    width: '90%',
    maxWidth: 400,
    maxHeight: WIN_H * 0.88,
    alignSelf: 'center',
  },
  propostaCardScroll: {
    maxHeight: WIN_H * 0.88,
  },
  propostaCardScrollContent: {
    flexGrow: 1,
    paddingBottom: 6,
  },
  propostaCard: {
    backgroundColor: P.white,
    borderRadius: radius.md,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.beigeD,
  },
  entregaPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: P.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.beigeD,
  },
  entregaPickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: P.greenL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entregaPickerTriggerText: {
    flex: 1,
    minWidth: 0,
  },
  entregaPickerTriggerKicker: {
    fontSize: 11,
    fontWeight: '600',
    color: P.textL,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  entregaPickerTriggerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: P.text,
    lineHeight: 20,
  },
  deliveryModalFill: {
    flex: 1,
  },
  deliverySheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  deliverySheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  deliverySheetCard: {
    backgroundColor: P.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 8,
    maxHeight: WIN_H * 0.78,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: P.beigeD,
  },
  deliverySheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: P.beigeMid,
    marginBottom: 14,
  },
  deliverySheetTitle: {
    fontFamily: fontSerif,
    fontSize: 20,
    fontWeight: '700',
    color: P.text,
    marginBottom: 6,
  },
  deliverySheetSub: {
    fontSize: 13,
    color: P.textM,
    lineHeight: 20,
    marginBottom: 16,
  },
  deliverySheetScroll: {
    maxHeight: WIN_H * 0.5,
  },
  deliveryOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.beigeD,
    backgroundColor: P.white,
  },
  deliveryOptionCardOn: {
    borderColor: P.green,
    backgroundColor: P.greenL,
  },
  deliveryOptionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: P.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryOptionIconCircleOn: {
    backgroundColor: P.white,
  },
  deliveryOptionBody: {
    flex: 1,
    minWidth: 0,
  },
  deliveryOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: P.text,
    marginBottom: 4,
  },
  deliveryOptionSub: {
    fontSize: 12,
    color: P.textM,
    lineHeight: 18,
  },
  deliverySheetCloseBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  deliverySheetCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: P.greenD,
  },
  propostaTitle: {
    fontFamily: fontSerif,
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
    marginBottom: 12,
  },
  propostaCookCard: {
    backgroundColor: P.cream,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.beigeD,
  },
  propostaCookHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  propostaCookAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: P.beigeD,
  },
  propostaCookEmoji: {
    fontSize: 40,
    lineHeight: 56,
    width: 56,
    textAlign: 'center',
  },
  propostaCookHeadCol: {
    flex: 1,
    minWidth: 0,
  },
  propostaCookHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  propostaCookLocLine: {
    fontSize: 12,
    color: P.textM,
    marginBottom: 10,
    lineHeight: 18,
  },
  propostaCookName: {
    fontSize: 17,
    fontWeight: '700',
    color: P.text,
    flex: 1,
    paddingRight: 8,
  },
  propostaCookStars: {
    fontSize: 14,
    fontWeight: '600',
    color: P.brownBtn,
  },
  propostaCookTag: {
    fontSize: 12,
    fontWeight: '600',
    color: P.greenD,
    marginBottom: 8,
  },
  propostaCookBio: {
    fontSize: 13,
    color: P.textM,
    lineHeight: 20,
    marginBottom: 8,
  },
  propostaCookMeta: {
    fontSize: 12,
    color: P.textL,
    marginBottom: 10,
  },
  propostaCookPrep: {
    fontSize: 13,
    fontWeight: '600',
    color: P.greenD,
    marginBottom: 10,
    lineHeight: 20,
  },
  propostaCookCta: {
    fontSize: 13,
    color: P.text,
    lineHeight: 20,
    fontWeight: '500',
  },
  propostaResumo: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.beigeD,
  },
  propostaResumoLine: {
    fontSize: 13,
    color: P.textM,
    marginBottom: 4,
  },
  propostaTotalPagar: {
    fontSize: 16,
    fontWeight: '700',
    color: P.greenD,
    marginTop: 6,
    marginBottom: 10,
  },
  propostaLocalTitulo: {
    fontSize: 12,
    fontWeight: '600',
    color: P.textM,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  propostaLocalText: {
    fontSize: 13,
    color: P.text,
    lineHeight: 20,
  },
  propostaNome: {
    fontSize: 14,
    color: P.text,
    lineHeight: 22,
    marginBottom: 10,
  },
  propostaValor: {
    fontSize: 15,
    fontWeight: '700',
    color: P.greenD,
    marginBottom: 6,
  },
  propostaEntrega: {
    fontSize: 13,
    color: P.textM,
    marginBottom: 18,
  },
  propostaActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  propostaBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    minWidth: 100,
    alignItems: 'center',
  },
  propostaBtnOutline: {
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    backgroundColor: P.white,
  },
  propostaBtnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.textM,
  },
  propostaBtnPrimary: {
    backgroundColor: P.green,
  },
  propostaBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  badgePrep: {
    backgroundColor: '#fff3cc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePrepText: {
    fontSize: 11,
    fontWeight: '600',
    color: P.brownBtn,
  },
  badgeDelivery: {
    backgroundColor: '#e3f2fd',
  },
  badgeDeliveryText: {
    color: '#1565c0',
  },
  confirmarEntregaBtn: {
    marginTop: 10,
    backgroundColor: P.green,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  confirmarEntregaBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  pedidoFoot: {
    fontSize: 12,
    color: P.textL,
  },
  pedidoEntregaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pedidoEntregaText: {
    fontSize: 12,
    color: P.textM,
    flex: 1,
  },
  payCta: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff3cc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  payCtaText: {
    flex: 1,
    fontSize: 12,
    color: '#7a4f00',
    fontWeight: '600',
  },
  cookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cookCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    backgroundColor: P.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.beigeD,
    overflow: 'hidden',
  },
  cookEmoji: {
    fontSize: 40,
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: P.beige,
  },
  cookBody: {
    padding: 10,
  },
  cookName: {
    fontSize: 14,
    fontWeight: '700',
    color: P.text,
  },
  cookLoc: {
    fontSize: 11,
    color: P.textL,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: P.beige,
  },
  tagG: {
    backgroundColor: P.greenL,
  },
  tagText: {
    fontSize: 10,
    color: P.textM,
    fontWeight: '500',
  },
  tagTextG: {
    color: P.greenD,
    fontWeight: '600',
  },
  cookFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  stars: {
    fontSize: 11,
    color: P.textM,
    fontWeight: '600',
  },
  priceLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: P.greenD,
  },
  bottomSafe: {
    backgroundColor: P.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.beigeD,
  },
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 4,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bnavItem: {
    alignItems: 'center',
    gap: 3,
    minWidth: 56,
    paddingVertical: 4,
  },
  bnavLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: P.textL,
  },
  bnavLabelOn: {
    color: P.greenD,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});

/**
 * Cliente home — `web-prototype/home-user.html` (cozinheiros mock; user/pedidos via API).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
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
  fetchPedidosClienteTodosApi,
  fetchPerfilClienteApi,
  responderPropostaClienteApi,
  type PedidoClienteAtivoJson,
  type PedidoClienteHistoricoJson,
  type SolicitacaoClienteJson,
} from '@/lib/api';
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

type EntregaOpcao = { id: string; label: string; taxa: number; estimativa?: boolean };

type PropostaModalState = {
  propostaId: number;
  cozinheiroNome: string;
  baseValor: number;
  opcionesEntrega: EntregaOpcao[];
  selectedEntregaId: string;
  tipoEntrega: string;
  cozinheiroEspecialidade: string;
  cozinheiroNota: number;
  cozinheiroRespostaTempo: string;
  cozinheiroSobre: string;
  tempoPreparoLabel: string;
  retiradaEndereco: string;
  entregaEnderecoCliente: string;
};

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

function iconForEntregaOpcao(id: string): ComponentProps<typeof MaterialIcons>['name'] {
  const m: Partial<Record<string, ComponentProps<typeof MaterialIcons>['name']>> = {
    retirada: 'storefront',
    entrega_bairro: 'delivery-dining',
    entrega_app: 'restaurant',
    entrega_uber: 'local-taxi',
  };
  return m[id] ?? 'local-shipping';
}

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
  const [deliveryPickerOpen, setDeliveryPickerOpen] = useState(false);
  /** Sessão: pedidos cujo lembrete de avaliação o utilizador já dispensou (Fechar) ou já abriu no histórico (Avaliar). */
  const ratingDismissedRef = useRef<Set<number>>(new Set());
  const [ratingNudge, setRatingNudge] = useState<PedidoClienteHistoricoJson | null>(null);

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
    ratingDismissedRef.current.clear();
    setRatingNudge(null);
  }, [user?.id]);

  const loadPerfil = useCallback(async () => {
    const res = await fetchPerfilClienteApi();
    if (res.ok) {
      setDisplayName(res.data.nome);
    } else if (user?.nome) {
      setDisplayName(user.nome);
    }
  }, [user?.nome]);

  const loadHomePedidos = useCallback(async () => {
    setPedidosLoading(true);
    try {
      const res = await fetchClienteHomePedidosApi();
      if (res.ok) {
        setSolicitacoes(res.solicitacoes);
        setPedidos(res.pedidos);
      } else {
        setSolicitacoes([]);
        setPedidos([]);
      }
    } catch {
      setSolicitacoes([]);
      setPedidos([]);
    } finally {
      setPedidosLoading(false);
    }
  }, []);

  const checkRatingNudge = useCallback(async () => {
    if (!user || user.tipo !== 'cliente') return;
    try {
      const res = await fetchPedidosClienteTodosApi(user.id);
      if (!res.ok) {
        setRatingNudge(null);
        return;
      }
      const next = res.pedidos.find(
        (p) =>
          p.status === 'entregue' && p.pode_avaliar && !ratingDismissedRef.current.has(p.id),
      );
      setRatingNudge(next ?? null);
    } catch {
      setRatingNudge(null);
    }
  }, [user]);

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

  useFocusEffect(
    useCallback(() => {
      if (!user || user.tipo !== 'cliente') return;
      void (async () => {
        await loadPerfil();
        await loadHomePedidos();
        await checkRatingNudge();
      })();
    }, [user, loadPerfil, loadHomePedidos, checkRatingNudge]),
  );

  const abrirModalProposta = useCallback(
    (s: SolicitacaoClienteJson) => {
      const p = s.proposta_pendente;
      if (!p) return;
      const opciones = p.opciones_entrega ?? [];
      setPropostaModal({
        propostaId: p.id,
        cozinheiroNome: p.cozinheiro_nome,
        baseValor: p.base_valor ?? p.valor,
        opcionesEntrega: opciones,
        selectedEntregaId: opciones[0]?.id ?? 'retirada',
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
        await loadHomePedidos();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Pedido', r.error);
      }
    },
    [propostaModal, loadHomePedidos],
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
      <Modal
        visible={ratingNudge != null && propostaModal == null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (ratingNudge) ratingDismissedRef.current.add(ratingNudge.id);
          setRatingNudge(null);
        }}>
        <Pressable
          style={styles.ratingBackdrop}
          onPress={() => {
            if (ratingNudge) ratingDismissedRef.current.add(ratingNudge.id);
            setRatingNudge(null);
          }}>
          <Pressable style={styles.ratingCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.ratingTitle}>Pedido entregue</Text>
            <Text style={styles.ratingBody}>
              Que tal avaliar o pedido #{ratingNudge ? String(ratingNudge.id).padStart(4, '0') : ''} com{' '}
              {ratingNudge?.cozinheiro_nome ?? ''}?
            </Text>
            <View style={styles.ratingActions}>
              <Pressable
                onPress={() =>
                  tap(() => {
                    if (ratingNudge) ratingDismissedRef.current.add(ratingNudge.id);
                    setRatingNudge(null);
                  })
                }
                style={({ pressed }) => [styles.ratingBtnGhost, pressed && styles.pressed]}>
                <Text style={styles.ratingBtnGhostText}>Fechar</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  tap(() => {
                    if (!ratingNudge) return;
                    const id = ratingNudge.id;
                    ratingDismissedRef.current.add(id);
                    setRatingNudge(null);
                    router.push({
                      pathname: '/(user)/receitas-enviadas',
                      params: { avaliar: String(id) },
                    });
                  })
                }
                style={({ pressed }) => [styles.ratingBtnPrimary, pressed && styles.pressed]}>
                <Text style={styles.ratingBtnPrimaryText}>Avaliar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
                      <View style={styles.propostaCookHead}>
                        <Text style={styles.propostaCookName}>{propostaModal.cozinheiroNome}</Text>
                        {propostaModal.cozinheiroNota > 0 ? (
                          <Text style={styles.propostaCookStars}>★ {propostaModal.cozinheiroNota.toFixed(1)}</Text>
                        ) : null}
                      </View>
                      {propostaModal.cozinheiroEspecialidade ? (
                        <Text style={styles.propostaCookTag}>{propostaModal.cozinheiroEspecialidade}</Text>
                      ) : null}
                      {propostaModal.cozinheiroSobre ? (
                        <Text style={styles.propostaCookBio}>{propostaModal.cozinheiroSobre}</Text>
                      ) : null}
                      {propostaModal.cozinheiroRespostaTempo ? (
                        <Text style={styles.propostaCookMeta}>{propostaModal.cozinheiroRespostaTempo}</Text>
                      ) : null}
                      {propostaModal.tempoPreparoLabel ? (
                        <Text style={styles.propostaCookPrep}>{propostaModal.tempoPreparoLabel}</Text>
                      ) : null}
                      <Text style={styles.propostaCookCta}>
                        {propostaModal.cozinheiroNome.split(' ')[0] ?? propostaModal.cozinheiroNome} aceitou preparar com base na
                        sua receita e nas observações que você enviou.
                      </Text>
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
                <View key={`s-${row.item.id}`} style={styles.pedidoCard}>
                  <View style={styles.pedidoHead}>
                    <View style={styles.pedidoHeadText}>
                      <Text style={styles.pedidoId}>
                        Solicitação #{String(row.item.id).padStart(4, '0')} · {row.item.data} · {row.item.hora}
                      </Text>
                      {row.item.situacao === 'aguardando_cozinheiro' && (
                        <Text style={styles.pedidoUser}>Aguardando um cozinheiro aceitar…</Text>
                      )}
                      {row.item.situacao === 'aguardando_cliente' && row.item.proposta_pendente && (
                        <>
                          <Text style={styles.pedidoUser}>
                            Proposta: {row.item.proposta_pendente.cozinheiro_nome} — R${' '}
                            {row.item.proposta_pendente.valor.toFixed(2)}
                          </Text>
                          <Pressable onPress={() => tap(() => abrirModalProposta(row.item))}>
                            <Text style={styles.linkProposta}>Ver detalhes da proposta</Text>
                          </Pressable>
                        </>
                      )}
                      {row.item.situacao === 'recusada_cliente' && (
                        <Text style={styles.pedidoMuted}>
                          Ninguém aceitará esta solicitação (recusou a proposta).
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
              ) : (
                <View key={`p-${row.item.id}`} style={styles.pedidoCard}>
                  <View style={styles.pedidoHead}>
                    <Pressable
                      onPress={() => tap(() => {})}
                      style={({ pressed }) => [styles.pedidoHeadMain, pressed && styles.pressed]}>
                      <View>
                        <Text style={styles.pedidoId}>
                          Pedido #{String(row.item.id).padStart(4, '0')} · {row.item.data}
                        </Text>
                        <Text style={styles.pedidoUser}>{row.item.cozinheiro_nome}</Text>
                      </View>
                      <View style={styles.badgePrep}>
                        <Text style={styles.badgePrepText}>{statusBadgeLabel(row.item.status)}</Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => tap(() => removerRow(row))}
                      hitSlop={8}
                      style={styles.removeIcon}>
                      <MaterialIcons name="close" size={22} color={P.textL} />
                    </Pressable>
                  </View>
                  <Text style={styles.pedidoFoot}>
                    {row.item.qtd_marmitas} marmitas · Total R$ {formatPedidoBrl(row.item.valor_total)} ·{' '}
                    {row.item.hora}
                  </Text>
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
          <Pressable onPress={() => tap(() => {})} style={styles.bnavItem}>
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
  ratingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ratingCard: {
    backgroundColor: P.white,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: P.beigeD,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  ratingTitle: {
    fontFamily: fontSerif,
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
    marginBottom: 10,
  },
  ratingBody: {
    fontSize: 14,
    color: P.textM,
    lineHeight: 22,
    marginBottom: 20,
  },
  ratingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  ratingBtnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    backgroundColor: P.white,
  },
  ratingBtnGhostText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.brownBtn,
  },
  ratingBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: P.greenD,
  },
  ratingBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
  pedidoHeadMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginRight: 4,
  },
  linkProposta: {
    fontSize: 12,
    fontWeight: '600',
    color: P.green,
    marginTop: 6,
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
  propostaCookHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  pedidoFoot: {
    fontSize: 12,
    color: P.textL,
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

import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoIcon } from '@/components/prototype/LogoIcon';
import { Routes } from '@/constants/routes';
import { fontSerif, logoSize, P, radius } from '@/constants/prototypeTheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  criarPropostaApi,
  fetchPerfilCozinheiroApi,
  fetchSolicitacaoDetalheApi,
  getApiBaseUrl,
  type SolicitacaoAbertaJson,
  type SolicitacaoClienteJson,
} from '@/lib/api';
import { brlToNumber, maskBrlFromDigits } from '@/lib/masks';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function propostaStatusLabel(status: number): string {
  switch (status) {
    case 0:
      return 'Aguardando resposta do cliente';
    case 1:
      return 'Aceita pelo cliente';
    case 2:
      return 'Recusada pelo cliente';
    default:
      return `Status ${status}`;
  }
}

function resolveReceitaUrl(link: string | null | undefined): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function isSolicitacaoAberta(
  s: SolicitacaoAbertaJson | SolicitacaoClienteJson,
): s is SolicitacaoAbertaJson {
  return (s as { tipo?: string }).tipo !== 'solicitacao';
}

export default function CookSolicitacaoDetalheScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const solicitacaoId = Number(params.id);

  const [solicitacao, setSolicitacao] = useState<SolicitacaoAbertaJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  const [valor, setValor] = useState('');
  const [tempoMin, setTempoMin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  // Só mostramos o input de tempo quando o cozinheiro oferece moto-boy
  // (ver PLAN_COZINHEIRO_SOLICITACOES.md §10.1).
  const [oferecemMotoboy, setOferecemMotoboy] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(solicitacaoId)) {
      setFetchErr('Solicitação inválida.');
      setLoading(false);
      return;
    }
    setFetchErr(null);
    const [solRes, perfilRes] = await Promise.all([
      fetchSolicitacaoDetalheApi(solicitacaoId),
      fetchPerfilCozinheiroApi(),
    ]);
    if (solRes.ok) {
      if (isSolicitacaoAberta(solRes.solicitacao)) {
        setSolicitacao(solRes.solicitacao);
      } else {
        setFetchErr('Esta solicitação não pertence a um cozinheiro.');
      }
    } else {
      setFetchErr(solRes.error);
    }
    setOferecemMotoboy(perfilRes.ok ? perfilRes.data.taxa_motoboy != null : false);
    setLoading(false);
  }, [solicitacaoId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onChangeValor = useCallback((text: string) => {
    setValor(maskBrlFromDigits(text));
    setFormErr(null);
  }, []);

  const onSubmit = useCallback(async () => {
    const numeric = brlToNumber(valor);
    if (!(numeric > 0)) {
      setFormErr('Informe um valor maior que zero.');
      return;
    }
    if (!solicitacao) return;

    let tempoMinutos: number | undefined;
    if (oferecemMotoboy) {
      const raw = tempoMin.trim();
      const parsed = raw === '' ? NaN : Number(raw);
      if (!Number.isFinite(parsed) || parsed < 5 || parsed > 240) {
        setFormErr('Informe um tempo estimado de entrega entre 5 e 240 minutos.');
        return;
      }
      tempoMinutos = Math.round(parsed);
    }

    setSubmitting(true);
    setFormErr(null);
    const res = await criarPropostaApi({
      solicitacao_id: solicitacao.id,
      valor: numeric,
      ...(tempoMinutos != null ? { tempo_entrega_min: tempoMinutos } : {}),
    });
    setSubmitting(false);

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Proposta enviada',
        `Sua proposta de ${formatBrl(Number(res.proposta.valor) || numeric)} foi enviada.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace(Routes.cookSolicitacoes),
          },
        ],
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (res.duplicadaPropostaId != null) {
      setFormErr(res.error);
      await load();
      return;
    }
    setFormErr(res.error);
  }, [valor, tempoMin, oferecemMotoboy, solicitacao, router, load]);

  const openReceita = useCallback(() => {
    const url = resolveReceitaUrl(solicitacao?.receita_link);
    if (!url) {
      Alert.alert('Receita', 'Esta solicitação não tem arquivo anexado.');
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert('Receita', 'Não foi possível abrir o arquivo anexado.'),
    );
  }, [solicitacao?.receita_link]);

  if (!user) return <Redirect href={Routes.login} />;
  if (user.tipo !== 'cozinheiro') return <Redirect href={Routes.tabs} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topnav}>
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace(Routes.cookSolicitacoes)
          }
          hitSlop={8}
          style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={P.text} />
        </Pressable>
        <View style={styles.topCenter}>
          <LogoIcon size={logoSize.nav} />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>Solicitação</Text>
            <Text style={styles.brandTag}>envio de proposta</Text>
          </View>
        </View>
        <View style={styles.topRightSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={P.green} size="large" />
        </View>
      ) : fetchErr || !solicitacao ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={40} color={P.textL} />
          <Text style={styles.emptyTitle}>Não foi possível carregar</Text>
          {fetchErr ? <Text style={styles.emptyBody}>{fetchErr}</Text> : null}
          <Pressable
            onPress={() => {
              setLoading(true);
              load();
            }}
            style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.id}>
                    #{solicitacao.id} · {solicitacao.data} {solicitacao.hora}
                  </Text>
                  <Text style={styles.cliente}>{solicitacao.cliente_nome}</Text>
                  {solicitacao.cliente_distancia_bucket ? (
                    <Text style={styles.clienteDist}>
                      ≈ {solicitacao.cliente_distancia_bucket} de você
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.badge, { backgroundColor: P.greenL }]}>
                  <Text style={[styles.badgeText, { color: P.greenD }]}>Aberta</Text>
                </View>
              </View>

              <View style={styles.kvGrid}>
                <Kv label="Dias" value={solicitacao.qtd_dias ? `${solicitacao.qtd_dias}` : '—'} />
                <Kv
                  label="Refeições/dia"
                  value={solicitacao.refeicoes_por_dia ? `${solicitacao.refeicoes_por_dia}` : '—'}
                />
                <Kv
                  label="Porções"
                  value={solicitacao.porcoes_por_refeicao ? `${solicitacao.porcoes_por_refeicao}` : '—'}
                />
                <Kv
                  label="Calorias/dia"
                  value={solicitacao.calorias_diarias ? `${solicitacao.calorias_diarias} kcal` : '—'}
                />
              </View>

              {solicitacao.restricoes ? (
                <Block label="Restrições" body={solicitacao.restricoes} />
              ) : null}
              {solicitacao.alimentos_proibidos ? (
                <Block
                  label="Alimentos proibidos"
                  body={solicitacao.alimentos_proibidos}
                />
              ) : null}
              {solicitacao.observacoes_nutricionista ? (
                <Block
                  label="Observações do nutricionista"
                  body={solicitacao.observacoes_nutricionista}
                />
              ) : null}
              {solicitacao.observacoes_adicionais ? (
                <Block
                  label="Observações do cliente"
                  body={solicitacao.observacoes_adicionais}
                />
              ) : null}

              <Pressable
                onPress={openReceita}
                style={({ pressed }) => [
                  styles.receitaBtn,
                  !solicitacao.receita_link && styles.receitaBtnMuted,
                  pressed && styles.pressed,
                ]}>
                <MaterialIcons
                  name="attach-file"
                  size={16}
                  color={solicitacao.receita_link ? P.greenD : P.textL}
                />
                <Text
                  style={[
                    styles.receitaBtnText,
                    !solicitacao.receita_link && { color: P.textL },
                  ]}>
                  {solicitacao.receita_link ? 'Abrir receita anexa' : 'Sem receita anexada'}
                </Text>
              </Pressable>

              {solicitacao.total_propostas > 0 ? (
                <Text style={styles.infoMuted}>
                  {solicitacao.total_propostas} cozinheiro
                  {solicitacao.total_propostas > 1 ? 's já enviaram' : ' já enviou'} proposta.
                </Text>
              ) : null}
            </View>

            {solicitacao.ja_tem_proposta_minha && solicitacao.minha_proposta ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Sua proposta</Text>
                <View style={styles.minhaRow}>
                  <Text style={styles.minhaValor}>
                    {formatBrl(Number(solicitacao.minha_proposta.valor) || 0)}
                  </Text>
                  <Text style={styles.minhaStatus}>
                    {propostaStatusLabel(solicitacao.minha_proposta.status)}
                  </Text>
                </View>
                {solicitacao.minha_proposta.tempo_entrega_min != null ? (
                  <Text style={styles.infoMuted}>
                    Tempo prometido (moto-boy): ~{solicitacao.minha_proposta.tempo_entrega_min} min
                  </Text>
                ) : null}
                {solicitacao.minha_proposta.data_criacao ? (
                  <Text style={styles.infoMuted}>
                    Enviada em {solicitacao.minha_proposta.data_criacao}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Enviar proposta</Text>
                <Text style={styles.labelSmall}>Valor total da proposta</Text>
                <TextInput
                  value={valor}
                  onChangeText={onChangeValor}
                  placeholder="R$ 0,00"
                  placeholderTextColor={P.textL}
                  keyboardType="numeric"
                  style={styles.input}
                  editable={!submitting}
                />
                {oferecemMotoboy ? (
                  <View style={styles.tempoBlock}>
                    <Text style={styles.labelSmall}>
                      Tempo estimado de entrega (moto-boy) · minutos
                    </Text>
                    <TextInput
                      value={tempoMin}
                      onChangeText={(t) => {
                        setTempoMin(t.replace(/\D/g, '').slice(0, 3));
                        setFormErr(null);
                      }}
                      placeholder="ex.: 45"
                      placeholderTextColor={P.textL}
                      keyboardType="numeric"
                      style={styles.input}
                      editable={!submitting}
                    />
                    <Text style={styles.tempoHint}>
                      Só aparecerá para o cliente se ele escolher &quot;Delivery Moto boy&quot;.
                      Entre 5 e 240 minutos.
                    </Text>
                  </View>
                ) : null}
                {formErr ? <Text style={styles.formErr}>{formErr}</Text> : null}
                <Pressable
                  disabled={submitting}
                  onPress={onSubmit}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && styles.pressed,
                    submitting && styles.disabled,
                  ]}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>✓ Enviar proposta</Text>
                  )}
                </Pressable>
                <Text style={styles.infoMuted}>
                  O cliente será notificado e poderá aceitar ou recusar sua proposta.
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvItem}>
      <Text style={styles.kvLbl}>{label}</Text>
      <Text style={styles.kvVal}>{value}</Text>
    </View>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockLbl}>{label}</Text>
      <Text style={styles.blockBody}>{body}</Text>
    </View>
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  emptyTitle: { fontFamily: fontSerif, fontSize: 18, fontWeight: '700', color: P.text },
  emptyBody: { fontSize: 13, color: P.textL, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: P.green,
    borderRadius: radius.sm,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  id: { fontSize: 12, color: P.textL },
  cliente: { fontSize: 17, fontWeight: '600', color: P.text, marginTop: 2 },
  clienteDist: { fontSize: 12, color: P.greenD, marginTop: 2, fontWeight: '500' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  kvGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  kvItem: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: P.cream,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: radius.sm,
    padding: 10,
  },
  kvLbl: { fontSize: 10, color: P.textL, textTransform: 'uppercase', letterSpacing: 0.3 },
  kvVal: { fontSize: 15, fontWeight: '600', color: P.text, marginTop: 4 },
  block: { marginTop: 12 },
  blockLbl: {
    fontSize: 11,
    color: P.textM,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  blockBody: { fontSize: 13, color: P.text, lineHeight: 20 },
  receitaBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
  },
  receitaBtnMuted: { opacity: 0.6 },
  receitaBtnText: { fontSize: 13, fontWeight: '600', color: P.greenD },
  infoMuted: { fontSize: 11, color: P.textL, marginTop: 10, lineHeight: 16 },
  sectionTitle: { fontWeight: '700', fontSize: 15, color: P.text, marginBottom: 8 },
  labelSmall: {
    fontSize: 11,
    color: P.textM,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    borderRadius: radius.md,
    fontSize: 18,
    backgroundColor: P.white,
    color: P.text,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: 12,
    backgroundColor: P.green,
    paddingVertical: 13,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  formErr: { color: P.errorText, fontSize: 12, marginTop: 6 },
  tempoBlock: { marginTop: 14 },
  tempoHint: { fontSize: 11, color: P.textL, marginTop: 6, lineHeight: 16 },
  minhaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minhaValor: { fontSize: 22, fontWeight: '700', color: P.greenD, fontFamily: fontSerif },
  minhaStatus: { fontSize: 12, color: P.textM, fontWeight: '500' },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.55 },
});

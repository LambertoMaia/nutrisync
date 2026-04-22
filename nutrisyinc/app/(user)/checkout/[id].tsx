import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { NavBackButton } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { FontFamily, NutrilhoColors, Radii, Shadows, Spacing } from '@/constants/theme';
import {
  confirmarPagamentoApi,
  getPagamentoStatusApi,
  iniciarPagamentoApi,
  type MetodoPagamento,
  type PagamentoJson,
} from '@/lib/api';

type Metodo = MetodoPagamento;

function formatBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

/** Formata o número do cartão em grupos de 4. */
function formatCardNumber(digits: string): string {
  return digits
    .replace(/\D+/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatValidade(raw: string): string {
  const digits = raw.replace(/\D+/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pedidoId = Number(id);

  const [loading, setLoading] = useState(true);
  const [pagamento, setPagamento] = useState<PagamentoJson | null>(null);
  const [metodo, setMetodo] = useState<Metodo>('pix');
  const [submitting, setSubmitting] = useState(false);

  // Form cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardValidade, setCardValidade] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardTitular, setCardTitular] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregar = useCallback(async () => {
    if (!Number.isFinite(pedidoId) || pedidoId <= 0) {
      setLoading(false);
      return;
    }
    const r = await getPagamentoStatusApi(pedidoId);
    if (r.ok) {
      setPagamento(r.pagamento);
      if (r.pagamento.metodo_pagamento) setMetodo(r.pagamento.metodo_pagamento);
    }
    setLoading(false);
  }, [pedidoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Polling quando o usuário já está no PIX — pega a confirmação fake
  // sem precisar tocar em nada.
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (pagamento?.status_pagamento === 'pago' || metodo !== 'pix') return;
    pollRef.current = setInterval(async () => {
      const r = await getPagamentoStatusApi(pedidoId);
      if (r.ok) setPagamento(r.pagamento);
    }, 6000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [pagamento?.status_pagamento, metodo, pedidoId]);

  const pixCopiaCola = pagamento?.pix_copia_cola || '';
  const pago = pagamento?.status_pagamento === 'pago';

  async function escolherMetodo(next: Metodo) {
    if (pago || submitting) return;
    setMetodo(next);
    setCardError(null);
    if (next === 'pix' && !pixCopiaCola) {
      setSubmitting(true);
      const r = await iniciarPagamentoApi(pedidoId, 'pix');
      setSubmitting(false);
      if (r.ok) setPagamento(r.pagamento);
      else Alert.alert('Não foi possível iniciar o PIX', r.error);
    }
  }

  async function copiarPix() {
    if (!pixCopiaCola) return;
    await Clipboard.setStringAsync(pixCopiaCola);
    Alert.alert('Copiado', 'Código PIX copiado para a área de transferência.');
  }

  async function confirmarPix() {
    if (submitting || pago) return;
    setSubmitting(true);
    const r = await confirmarPagamentoApi(pedidoId, 'pix');
    setSubmitting(false);
    if (r.ok) {
      setPagamento(r.pagamento);
      Alert.alert('Pagamento confirmado', 'Seu pedido está pago.', [
        { text: 'OK', onPress: () => router.replace('/(user)/home') },
      ]);
    } else {
      Alert.alert('Erro', r.error);
    }
  }

  async function pagarCartao() {
    if (submitting || pago) return;
    const numero = cardNumber.replace(/\D+/g, '');
    const cvv = cardCvv.replace(/\D+/g, '');
    const validade = cardValidade;
    const titular = cardTitular.trim();
    if (numero.length < 13) {
      setCardError('Número do cartão inválido.');
      return;
    }
    if (cvv.length < 3) {
      setCardError('CVV inválido.');
      return;
    }
    if (validade.replace(/\D+/g, '').length !== 4) {
      setCardError('Validade deve ser MM/AA.');
      return;
    }
    if (titular.length < 2) {
      setCardError('Informe o nome do titular.');
      return;
    }
    setCardError(null);
    setSubmitting(true);
    const r = await confirmarPagamentoApi(pedidoId, metodo === 'debito' ? 'debito' : 'credito', {
      numero,
      cvv,
      validade,
      titular,
    });
    setSubmitting(false);
    if (r.ok) {
      setPagamento(r.pagamento);
      Alert.alert('Pagamento aprovado', 'Seu pedido está pago.', [
        { text: 'OK', onPress: () => router.replace('/(user)/home') },
      ]);
    } else {
      setCardError(r.error);
    }
  }

  const valor = pagamento?.valor ?? 0;

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <NavBackButton />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pagamento</Text>
          <Text style={styles.subtitle}>Pedido #{Number.isFinite(pedidoId) ? pedidoId : '—'}</Text>
        </View>
      </View>
    ),
    [pedidoId],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={NutrilhoColors.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!pagamento) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.center}>
          <Text style={styles.bodyText}>Não foi possível carregar o pedido.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {header}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total a pagar</Text>
            <Text style={styles.totalValue}>{formatBRL(valor)}</Text>
            {pago ? (
              <View style={styles.paidBadge}>
                <MaterialIcons name="check-circle" size={16} color="#2e7d32" />
                <Text style={styles.paidBadgeText}>Pago</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Forma de pagamento</Text>
          <View style={styles.methodRow}>
            <MethodChip
              active={metodo === 'pix'}
              icon="qr-code-2"
              label="PIX"
              onPress={() => escolherMetodo('pix')}
              disabled={pago}
            />
            <MethodChip
              active={metodo === 'credito'}
              icon="credit-card"
              label="Crédito"
              onPress={() => escolherMetodo('credito')}
              disabled={pago}
            />
            <MethodChip
              active={metodo === 'debito'}
              icon="credit-score"
              label="Débito"
              onPress={() => escolherMetodo('debito')}
              disabled={pago}
            />
          </View>

          {metodo === 'pix' ? (
            <View style={styles.pixCard}>
              <Text style={styles.pixTitle}>Pague com PIX</Text>
              <Text style={styles.pixBody}>
                Escaneie o QR code no seu app bancário ou toque em copiar o código e cole na
                área "Pix Copia e Cola".
              </Text>
              <View style={styles.qrBox}>
                <MaterialIcons name="qr-code-2" size={160} color={NutrilhoColors.greenD} />
                <Text style={styles.qrFakeCaption}>Simulação — nenhum valor real é movimentado.</Text>
              </View>
              <View style={styles.copyBox}>
                <Text style={styles.copyText} numberOfLines={2}>
                  {pixCopiaCola || 'Gerando código…'}
                </Text>
                <Pressable
                  onPress={copiarPix}
                  disabled={!pixCopiaCola}
                  style={[styles.copyBtn, !pixCopiaCola && styles.copyBtnDisabled]}
                >
                  <MaterialIcons name="content-copy" size={18} color="#fff" />
                  <Text style={styles.copyBtnText}>Copiar</Text>
                </Pressable>
              </View>
              {pago ? null : (
                <Button
                  title={submitting ? 'Confirmando…' : 'Já paguei'}
                  onPress={confirmarPix}
                  disabled={submitting}
                />
              )}
            </View>
          ) : (
            <View style={styles.cardForm}>
              <Text style={styles.pixTitle}>
                {metodo === 'credito' ? 'Cartão de crédito' : 'Cartão de débito'}
              </Text>
              <FieldLabel>Número do cartão</FieldLabel>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={NutrilhoColors.textL}
                keyboardType="number-pad"
                editable={!pago && !submitting}
                maxLength={23}
              />
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Validade</FieldLabel>
                  <TextInput
                    style={styles.input}
                    value={cardValidade}
                    onChangeText={(t) => setCardValidade(formatValidade(t))}
                    placeholder="MM/AA"
                    placeholderTextColor={NutrilhoColors.textL}
                    keyboardType="number-pad"
                    editable={!pago && !submitting}
                    maxLength={5}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <FieldLabel>CVV</FieldLabel>
                  <TextInput
                    style={styles.input}
                    value={cardCvv}
                    onChangeText={(t) => setCardCvv(t.replace(/\D+/g, '').slice(0, 4))}
                    placeholder="123"
                    placeholderTextColor={NutrilhoColors.textL}
                    keyboardType="number-pad"
                    secureTextEntry
                    editable={!pago && !submitting}
                    maxLength={4}
                  />
                </View>
              </View>
              <FieldLabel>Nome do titular</FieldLabel>
              <TextInput
                style={styles.input}
                value={cardTitular}
                onChangeText={setCardTitular}
                placeholder="Como está impresso no cartão"
                placeholderTextColor={NutrilhoColors.textL}
                autoCapitalize="characters"
                editable={!pago && !submitting}
              />
              {cardError ? <Text style={styles.errorText}>{cardError}</Text> : null}
              {pago ? null : (
                <Button
                  title={submitting ? 'Processando…' : `Pagar ${formatBRL(valor)}`}
                  onPress={pagarCartao}
                  disabled={submitting}
                />
              )}
            </View>
          )}

          {pago ? (
            <Button
              title="Voltar para o início"
              onPress={() => router.replace('/(user)/home')}
              variant="secondary"
            />
          ) : (
            <Pressable onPress={() => router.replace('/(user)/home')} style={styles.laterBtn}>
              <Text style={styles.laterText}>Pagar depois</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MethodChip({
  active,
  icon,
  label,
  onPress,
  disabled,
}: {
  active: boolean;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.method, active && styles.methodActive, disabled && styles.methodDisabled]}
    >
      <MaterialIcons
        name={icon}
        size={22}
        color={active ? '#fff' : NutrilhoColors.greenD}
      />
      <Text style={[styles.methodText, active && styles.methodTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NutrilhoColors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontFamily: FontFamily.sansBold, fontSize: 22, color: NutrilhoColors.text },
  subtitle: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: NutrilhoColors.textM },
  scroll: { padding: Spacing.lg, gap: 16, paddingBottom: 40 },
  bodyText: { fontFamily: FontFamily.sansRegular, color: NutrilhoColors.textM },
  totalCard: {
    backgroundColor: '#fff',
    borderRadius: Radii.lg,
    padding: 18,
    ...Shadows.card,
  },
  totalLabel: { fontFamily: FontFamily.sansMedium, color: NutrilhoColors.textM },
  totalValue: {
    fontFamily: FontFamily.sansBold,
    fontSize: 28,
    color: NutrilhoColors.greenD,
    marginTop: 4,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paidBadgeText: { color: '#2e7d32', fontFamily: FontFamily.sansSemiBold, fontSize: 12 },
  sectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: NutrilhoColors.textM,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  methodRow: { flexDirection: 'row', gap: 10 },
  method: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: Radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: NutrilhoColors.beigeMid,
    gap: 6,
  },
  methodActive: {
    backgroundColor: NutrilhoColors.greenD,
    borderColor: NutrilhoColors.greenD,
  },
  methodDisabled: { opacity: 0.6 },
  methodText: { fontFamily: FontFamily.sansSemiBold, color: NutrilhoColors.greenD, fontSize: 13 },
  methodTextActive: { color: '#fff' },
  pixCard: {
    backgroundColor: '#fff',
    borderRadius: Radii.lg,
    padding: 18,
    gap: 12,
    ...Shadows.card,
  },
  pixTitle: { fontFamily: FontFamily.sansBold, fontSize: 18, color: NutrilhoColors.text },
  pixBody: { fontFamily: FontFamily.sansRegular, color: NutrilhoColors.textM, lineHeight: 20 },
  qrBox: {
    backgroundColor: NutrilhoColors.beige,
    borderRadius: Radii.md,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: NutrilhoColors.beigeMid,
  },
  qrFakeCaption: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: NutrilhoColors.textL,
    textAlign: 'center',
  },
  copyBox: {
    backgroundColor: NutrilhoColors.beige,
    borderRadius: Radii.md,
    padding: 12,
    gap: 8,
  },
  copyText: {
    fontFamily: 'monospace' as any,
    fontSize: 12,
    color: NutrilhoColors.text,
  },
  copyBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: NutrilhoColors.greenD,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.sm,
  },
  copyBtnDisabled: { opacity: 0.5 },
  copyBtnText: { color: '#fff', fontFamily: FontFamily.sansSemiBold, fontSize: 13 },
  cardForm: {
    backgroundColor: '#fff',
    borderRadius: Radii.lg,
    padding: 18,
    gap: 10,
    ...Shadows.card,
  },
  fieldLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: NutrilhoColors.textM,
    marginBottom: 4,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: NutrilhoColors.beige,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: NutrilhoColors.text,
    borderWidth: 1,
    borderColor: NutrilhoColors.beigeMid,
  },
  row2: { flexDirection: 'row' },
  errorText: {
    color: '#b3261e',
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    marginTop: 4,
  },
  laterBtn: { alignSelf: 'center', paddingVertical: 8 },
  laterText: {
    color: NutrilhoColors.textM,
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});

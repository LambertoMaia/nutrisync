import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { AddressConfirmModal, type AddressFormData } from '@/components/register/AddressConfirmModal';
import { EmailExistsModal } from '@/components/register/EmailExistsModal';
import { PasswordField } from '@/components/register/PasswordField';
import { PhoneField } from '@/components/register/PhoneField';
import { LogoMark } from '@/components/prototype/LogoMark';
import { FormField } from '@/components/prototype/FormField';
import { fontSerif, P, radius } from '@/constants/prototypeTheme';
import { useAuth } from '@/contexts/AuthContext';
import { registerClienteApi, registerCozinheiroApi, type RegisterResult } from '@/lib/api';
import { maskCep } from '@/lib/masks';
import { fetchViaCep } from '@/lib/viacep';

const ESPECIALIDADES = [
  'Low carb',
  'Hipertrofia',
  'Vegano',
  'Sem glúten',
  'Sem lactose',
  'Diabéticos',
  'Emagrecimento',
  'Manutenção',
] as const;

const OBJETIVOS_ALIMENTAR = [
  'Emagrecer',
  'Ganhar massa muscular',
  'Manutenção de peso',
  'Saúde e qualidade de vida',
] as const;

const emptyAddress: AddressFormData = {
  logradouro: '',
  bairro: '',
  localidade: '',
  uf: '',
  numero: '',
  complemento: '',
};

type Role = 'cliente' | 'cozinheiro';

export default function RegisterScreen() {
  const router = useRouter();
  const { setUserFromSession } = useAuth();
  const [role, setRole] = useState<Role>('cliente');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefoneDigits, setTelefoneDigits] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [restricao, setRestricao] = useState('');

  const [objetivos, setObjetivos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(OBJETIVOS_ALIMENTAR.map((o) => [o, false])),
  );

  const [cepDigits, setCepDigits] = useState('');
  const [savedCepDigits, setSavedCepDigits] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressFormData>(emptyAddress);
  const [addressSaved, setAddressSaved] = useState<AddressFormData | null>(null);

  const [spec, setSpec] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ESPECIALIDADES.map((s) => [s, false])),
  );
  const [sobreVoce, setSobreVoce] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [emailTakenOpen, setEmailTakenOpen] = useState(false);
  const [emailTakenMsg, setEmailTakenMsg] = useState('');

  const cepDisplay = useMemo(() => maskCep(cepDigits), [cepDigits]);

  /** If user edits CEP after a confirmed address, invalidate until they search again. */
  useEffect(() => {
    if (!addressSaved || !savedCepDigits) return;
    if (cepDigits.replace(/\D/g, '') !== savedCepDigits) {
      setAddressSaved(null);
      setSavedCepDigits('');
    }
  }, [cepDigits, savedCepDigits, addressSaved]);

  const tap = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  const toggleSpec = useCallback((key: string) => {
    Haptics.selectionAsync();
    setSpec((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleObjetivo = useCallback((key: string) => {
    Haptics.selectionAsync();
    setObjetivos((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const goHome = useCallback(() => {
    tap(() => router.replace('/(tabs)'));
  }, [router, tap]);

  const handleRegisterResult = useCallback(
    async (result: RegisterResult, _successBody: string) => {
      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await setUserFromSession(result.data);
        const tipo = result.data.usuario_tipo === 'cozinheiro' ? 'cozinheiro' : 'cliente';
        if (tipo === 'cliente') {
          router.replace('/home');
        } else {
          router.replace('/(tabs)');
        }
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (result.error_code === 'EMAIL_TAKEN') {
        setEmailTakenMsg(result.error);
        setEmailTakenOpen(true);
        return;
      }
      Alert.alert('Cadastro', result.error);
    },
    [router, setUserFromSession],
  );

  const buscarCep = useCallback(async () => {
    const clean = cepDigits.replace(/\D/g, '');
    if (clean.length !== 8) {
      Alert.alert('CEP', 'Informe o CEP com 8 dígitos.');
      return;
    }
    setCepLoading(true);
    try {
      const data = await fetchViaCep(clean);
      setAddressDraft({
        logradouro: data.logradouro ?? '',
        bairro: data.bairro ?? '',
        localidade: data.localidade ?? '',
        uf: data.uf ?? '',
        numero: addressSaved?.numero ?? '',
        complemento: addressSaved?.complemento ?? '',
      });
      setAddressModalVisible(true);
    } catch (e) {
      Alert.alert('CEP', e instanceof Error ? e.message : 'Não foi possível buscar o CEP.');
    } finally {
      setCepLoading(false);
    }
  }, [cepDigits, addressSaved]);

  const abrirEdicaoEndereco = useCallback(() => {
    if (addressSaved) {
      setAddressDraft(addressSaved);
      setAddressModalVisible(true);
    }
  }, [addressSaved]);

  const onConfirmAddress = useCallback((data: AddressFormData) => {
    setSavedCepDigits(cepDigits.replace(/\D/g, ''));
    setAddressSaved(data);
    setAddressModalVisible(false);
  }, [cepDigits]);

  const onChangeCepFromModal = useCallback(() => {
    setAddressModalVisible(false);
    setAddressSaved(null);
    setSavedCepDigits('');
  }, []);

  const submitCliente = useCallback(async () => {
    if (!nome.trim()) {
      Alert.alert('Cadastro', 'Informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Cadastro', 'Informe seu e-mail.');
      return;
    }
    if (!telefoneDigits || telefoneDigits.length < 10) {
      Alert.alert('Telefone', 'Informe um telefone válido com DDD.');
      return;
    }
    if (!addressSaved) {
      Alert.alert('Endereço', 'Busque o CEP e confirme o endereço no modal.');
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert('Senha', 'As senhas não coincidem.');
      return;
    }
    const objetivosList = OBJETIVOS_ALIMENTAR.filter((o) => objetivos[o]);
    setSubmitting(true);
    try {
      const result = await registerClienteApi({
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefoneDigits,
        senha,
        confirmar_senha: confirmarSenha,
        cep: savedCepDigits,
        logradouro: addressSaved.logradouro,
        bairro: addressSaved.bairro,
        localidade: addressSaved.localidade,
        uf: addressSaved.uf,
        numero: addressSaved.numero,
        complemento: addressSaved.complemento,
        restricao: restricao.trim(),
        objetivos: objetivosList,
      });
      await handleRegisterResult(result, 'Sua conta de cliente foi registrada.');
    } finally {
      setSubmitting(false);
    }
  }, [
    nome,
    email,
    telefoneDigits,
    addressSaved,
    senha,
    confirmarSenha,
    objetivos,
    restricao,
    savedCepDigits,
    handleRegisterResult,
  ]);

  const submitCozinheiro = useCallback(async () => {
    if (!nome.trim()) {
      Alert.alert('Cadastro', 'Informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Cadastro', 'Informe seu e-mail.');
      return;
    }
    if (!telefoneDigits || telefoneDigits.length < 10) {
      Alert.alert('Telefone', 'Informe um telefone válido com DDD.');
      return;
    }
    const selectedSpecs = ESPECIALIDADES.filter((s) => spec[s]);
    if (selectedSpecs.length === 0) {
      Alert.alert('Especialidades', 'Selecione pelo menos uma especialidade.');
      return;
    }
    if (!addressSaved) {
      Alert.alert('Endereço', 'Busque o CEP e confirme o endereço no modal.');
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert('Senha', 'As senhas não coincidem.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await registerCozinheiroApi({
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefoneDigits,
        senha,
        confirmar_senha: confirmarSenha,
        cep: savedCepDigits,
        logradouro: addressSaved.logradouro,
        bairro: addressSaved.bairro,
        localidade: addressSaved.localidade,
        uf: addressSaved.uf,
        numero: addressSaved.numero,
        complemento: addressSaved.complemento,
        especialidades: selectedSpecs,
        sobre_voce: sobreVoce.trim(),
      });
      await handleRegisterResult(result, 'Seu cadastro de cozinheiro foi registrado.');
    } finally {
      setSubmitting(false);
    }
  }, [
    nome,
    email,
    telefoneDigits,
    spec,
    addressSaved,
    senha,
    confirmarSenha,
    savedCepDigits,
    sobreVoce,
    handleRegisterResult,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AddressConfirmModal
        visible={addressModalVisible}
        initial={addressDraft}
        onClose={() => setAddressModalVisible(false)}
        onConfirm={onConfirmAddress}
        onChangeCep={onChangeCepFromModal}
      />
      <EmailExistsModal
        visible={emailTakenOpen}
        message={emailTakenMsg}
        onDismiss={() => setEmailTakenOpen(false)}
        onGoLogin={() => {
          setEmailTakenOpen(false);
          router.push('/login');
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}>
        <View style={styles.topnav}>
          <LogoMark onPress={goHome} />
          <Pressable
            onPress={() => tap(() => router.push('/login'))}
            style={({ pressed }) => [styles.btnNavGhost, pressed && styles.pressed]}>
            <Text style={styles.btnNavGhostText}>Já tenho conta</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.formWrap}>
            <Text style={styles.formTitle}>Criar conta</Text>
            <Text style={styles.formSub}>Escolha seu perfil para personalizar o cadastro</Text>

            <View style={styles.roleGrid}>
              <Pressable
                onPress={() => tap(() => setRole('cliente'))}
                style={[styles.roleCard, role === 'cliente' && styles.roleCardOn]}>
                <Text style={styles.roleEmoji}>🧑</Text>
                <Text style={[styles.roleCardTitle, role === 'cliente' && styles.roleCardTitleOn]}>
                  Sou cliente
                </Text>
                <Text style={styles.roleCardHint}>Quero pedir marmitas</Text>
              </Pressable>
              <Pressable
                onPress={() => tap(() => setRole('cozinheiro'))}
                style={[styles.roleCard, role === 'cozinheiro' && styles.roleCardOn]}>
                <Text style={styles.roleEmoji}>👨‍🍳</Text>
                <Text style={[styles.roleCardTitle, role === 'cozinheiro' && styles.roleCardTitleOn]}>
                  Sou cozinheiro
                </Text>
                <Text style={styles.roleCardHint}>Quero oferecer marmitas</Text>
              </Pressable>
            </View>

            <FormField label="Nome completo" placeholder="Ex: Maria Silva" value={nome} onChangeText={setNome} />
            <FormField
              label="E-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="maria@email.com"
              value={email}
              onChangeText={setEmail}
            />
            <PhoneField label="Telefone / WhatsApp" value={telefoneDigits} onChangeDigits={setTelefoneDigits} />
            <PasswordField
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChangeText={setSenha}
            />
            <PasswordField
              label="Confirmar senha"
              placeholder="Repita a senha"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
            />

            {role === 'cliente' ? (
              <>
                <FormField
                  label="Restrições alimentares (opcional)"
                  placeholder="Ex: sem glúten, sem lactose, sem amendoim"
                  value={restricao}
                  onChangeText={setRestricao}
                />

                <Text style={styles.specLabel}>Objetivo alimentar</Text>
                <Text style={styles.specHint}>Selecione uma ou mais opções</Text>
                <View style={styles.specGrid}>
                  {OBJETIVOS_ALIMENTAR.map((label) => (
                    <Pressable
                      key={label}
                      onPress={() => toggleObjetivo(label)}
                      style={[styles.specChip, objetivos[label] && styles.specChipOn]}>
                      <Text style={[styles.specChipText, objetivos[label] && styles.specChipTextOn]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.divider} />
                <SectionHeader icon="📍" iconBg={P.greenL} title="Endereço" />
                <CepBlock
                  cepDisplay={cepDisplay}
                  onChangeCepDigits={setCepDigits}
                  cepLoading={cepLoading}
                  onBuscar={buscarCep}
                  addressSaved={addressSaved}
                  onEditar={abrirEdicaoEndereco}
                />

                <Pressable
                  onPress={submitCliente}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    pressed && styles.pressed,
                    submitting && styles.disabled,
                  ]}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Criar minha conta</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.divider} />
                <SectionHeader icon="🍳" iconBg={P.verifyBg} title="Informações do cozinheiro" />

                <SectionHeader icon="📍" iconBg={P.greenL} title="Endereço" />
                <CepBlock
                  cepDisplay={cepDisplay}
                  onChangeCepDigits={setCepDigits}
                  cepLoading={cepLoading}
                  onBuscar={buscarCep}
                  addressSaved={addressSaved}
                  onEditar={abrirEdicaoEndereco}
                />

                <Text style={styles.specLabel}>Especialidades (selecione todas que se aplicam)</Text>
                <View style={styles.specGrid}>
                  {ESPECIALIDADES.map((label) => (
                    <Pressable
                      key={label}
                      onPress={() => toggleSpec(label)}
                      style={[styles.specChip, spec[label] && styles.specChipOn]}>
                      <Text style={[styles.specChipText, spec[label] && styles.specChipTextOn]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.labelBlock}>Sobre você (aparece no seu perfil público)</Text>
                <TextInput
                  placeholder="Ex: Cozinheira especializada em alimentação saudável há 3 anos..."
                  placeholderTextColor={P.textL}
                  multiline
                  value={sobreVoce}
                  onChangeText={setSobreVoce}
                  style={styles.textarea}
                  textAlignVertical="top"
                />

                <View style={styles.verifyBox}>
                  <Text style={styles.verifyText}>
                    <Text style={styles.verifyStrong}>🔒 Verificação posterior:</Text> após o cadastro, nossa equipe
                    entrará em contato via WhatsApp para verificar sua cozinha. Só cozinheiros verificados aparecem no
                    marketplace.
                  </Text>
                </View>

                <Pressable
                  onPress={submitCozinheiro}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.btnCook,
                    pressed && styles.pressed,
                    submitting && styles.disabled,
                  ]}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Cadastrar como cozinheiro</Text>
                  )}
                </Pressable>
              </>
            )}

            <View style={styles.footerRow}>
              <Text style={styles.footerMuted}>Já tem conta? </Text>
              <Pressable onPress={() => tap(() => router.push('/login'))}>
                <Text style={styles.link}>Entrar</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CepBlock({
  cepDisplay,
  onChangeCepDigits,
  cepLoading,
  onBuscar,
  addressSaved,
  onEditar,
}: {
  cepDisplay: string;
  onChangeCepDigits: (digits: string) => void;
  cepLoading: boolean;
  onBuscar: () => void;
  addressSaved: AddressFormData | null;
  onEditar: () => void;
}) {
  return (
    <>
      <View style={styles.wrap}>
        <Text style={styles.label}>CEP</Text>
        <TextInput
          placeholder="00000-000"
          placeholderTextColor={P.textL}
          keyboardType="number-pad"
          inputMode="numeric"
          value={cepDisplay}
          onChangeText={(t) => onChangeCepDigits(t.replace(/\D/g, '').slice(0, 8))}
          maxLength={9}
          style={styles.input}
        />
      </View>
      <Pressable
        onPress={onBuscar}
        disabled={cepLoading}
        style={({ pressed }) => [styles.btnBuscarCep, pressed && styles.pressed, cepLoading && styles.disabled]}>
        {cepLoading ? (
          <ActivityIndicator color={P.greenD} />
        ) : (
          <Text style={styles.btnBuscarCepText}>Buscar endereço</Text>
        )}
      </Pressable>

      {addressSaved ? (
        <View style={styles.addrOk}>
          <Text style={styles.addrOkTitle}>Endereço confirmado</Text>
          <Text style={styles.addrOkLine} numberOfLines={3}>
            {addressSaved.logradouro}
            {addressSaved.numero ? `, ${addressSaved.numero}` : ''}
            {addressSaved.complemento ? ` — ${addressSaved.complemento}` : ''}
            {'\n'}
            {addressSaved.bairro} — {addressSaved.localidade}/{addressSaved.uf}
          </Text>
          <Pressable onPress={onEditar} style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}>
            <Text style={styles.linkBtnText}>Editar endereço</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

function SectionHeader({ icon, iconBg, title }: { icon: string; iconBg: string; title: string }) {
  return (
    <View style={styles.secHeadRow}>
      <View style={[styles.secHeadIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.secHeadGlyph}>{icon}</Text>
      </View>
      <Text style={styles.secHeadTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: P.beige,
  },
  flex: {
    flex: 1,
  },
  topnav: {
    backgroundColor: P.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.beigeD,
    paddingHorizontal: 19,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  btnNavGhost: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnNavGhostText: {
    fontSize: 13,
    fontWeight: '500',
    color: P.textM,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 28,
    paddingHorizontal: 21,
    paddingBottom: 40,
  },
  formWrap: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  formTitle: {
    fontFamily: fontSerif,
    fontSize: 22,
    fontWeight: '700',
    color: P.text,
    marginBottom: 6,
  },
  formSub: {
    fontSize: 13,
    color: P.textL,
    marginBottom: 22,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 22,
  },
  roleCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: P.beigeMid,
    backgroundColor: P.white,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  roleCardOn: {
    borderColor: P.green,
    backgroundColor: P.greenL,
  },
  roleEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  roleCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: P.text,
    marginBottom: 4,
  },
  roleCardTitleOn: {
    color: P.greenD,
  },
  roleCardHint: {
    fontSize: 11,
    color: P.textL,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: P.beigeD,
    marginVertical: 16,
  },
  secHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  secHeadIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secHeadGlyph: {
    fontSize: 14,
  },
  secHeadTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: P.textM,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  specHint: {
    fontSize: 12,
    color: P.textL,
    marginBottom: 8,
    marginTop: -4,
  },
  btnPrimary: {
    backgroundColor: P.green,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: P.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  btnCook: {
    backgroundColor: P.brownBtn,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  specLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: P.textM,
    marginBottom: 8,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 16,
  },
  specChip: {
    width: '48%',
    flexGrow: 1,
    minWidth: '45%',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    backgroundColor: P.white,
  },
  specChipOn: {
    borderColor: P.green,
    backgroundColor: P.greenL,
  },
  specChipText: {
    fontSize: 13,
    color: P.textM,
    textAlign: 'center',
  },
  specChipTextOn: {
    fontWeight: '600',
    color: P.greenD,
  },
  labelBlock: {
    fontSize: 11,
    fontWeight: '600',
    color: P.textM,
    marginBottom: 6,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    borderRadius: radius.md,
    fontSize: 14,
    backgroundColor: P.white,
    color: P.text,
    marginBottom: 16,
  },
  verifyBox: {
    backgroundColor: P.greenL,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  verifyText: {
    fontSize: 12,
    color: P.greenD,
    lineHeight: 19,
  },
  verifyStrong: {
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerMuted: {
    fontSize: 13,
    color: P.textL,
  },
  link: {
    fontSize: 13,
    color: P.green,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.9,
  },
  wrap: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: P.textM,
    marginBottom: 6,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    borderRadius: radius.md,
    fontSize: 14,
    backgroundColor: P.white,
    color: P.text,
  },
  btnBuscarCep: {
    borderWidth: 1.5,
    borderColor: P.green,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: P.greenL,
  },
  btnBuscarCepText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.greenD,
  },
  disabled: {
    opacity: 0.6,
  },
  addrOk: {
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.beigeMid,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  addrOkTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: P.greenD,
    marginBottom: 6,
  },
  addrOkLine: {
    fontSize: 13,
    color: P.textM,
    lineHeight: 20,
  },
  linkBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  linkBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.green,
  },
});

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { LogoMark } from '@/components/logo-mark';
import { TopNav } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { LabeledInput } from '@/components/ui/labeled-input';
import { Routes } from '@/constants/routes';
import { useAuth } from '@/contexts/auth-context';
import { FontFamily, NutrilhoColors, Radii, Spacing } from '@/constants/theme';
import { formatBrazilCepMask, stripCepDigits } from '@/lib/cep-mask';
import { formatBrazilPhoneMask } from '@/lib/phone-mask';
import { fetchViaCep } from '@/lib/viacep';
import { validateRegisterCommon } from '@/lib/validation';

const OBJECTIVES = ['Emagrecer', 'Ganhar massa muscular', 'Manutenção do peso', 'Saúde e qualidade de vida'] as const;
const DELIVERY_METHODS = [
  { label: 'Motoboy' as const, icon: 'bicycle-outline' as const },
  { label: 'Uber' as const, icon: 'car-outline' as const },
  { label: 'Retirada no local' as const, icon: 'storefront-outline' as const },
];
const SPECS = [
  'Low carb',
  'Hipertrofia',
  'Vegano',
  'Sem glúten',
  'Sem lactose',
  'Diabéticos',
  'Emagrecimento',
  'Manutenção',
] as const;

export default function RegisterScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  function retornar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(Routes.tabs);
    }
  }
  const [profile, setProfile] = useState<'client' | 'cook'>('client');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [objectives, setObjectives] = useState<Record<string, boolean>>({});
  const [restrictions, setRestrictions] = useState('');
  const [cepCliente, setCepCliente] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [needsAddressConfirmClient, setNeedsAddressConfirmClient] = useState(false);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [confirmedForCep, setConfirmedForCep] = useState<string | null>(null);
  const [addrLogradouro, setAddrLogradouro] = useState('');
  const [addrBairro, setAddrBairro] = useState('');
  const [addrLocalidade, setAddrLocalidade] = useState('');
  const [addrUf, setAddrUf] = useState('');
  const [addrNumero, setAddrNumero] = useState('');
  const [addrComplemento, setAddrComplemento] = useState('');

  const [cepCook, setCepCook] = useState('');
  const [cepLoadingCook, setCepLoadingCook] = useState(false);
  const [needsAddressConfirmCook, setNeedsAddressConfirmCook] = useState(false);
  const [cookAddressConfirmed, setCookAddressConfirmed] = useState(false);
  const [confirmedForCepCook, setConfirmedForCepCook] = useState<string | null>(null);
  const [cookLogradouro, setCookLogradouro] = useState('');
  const [cookBairro, setCookBairro] = useState('');
  const [cookLocalidade, setCookLocalidade] = useState('');
  const [cookUf, setCookUf] = useState('');
  const [cookNumero, setCookNumero] = useState('');
  const [cookComplemento, setCookComplemento] = useState('');

  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressForRole, setAddressForRole] = useState<'client' | 'cook' | null>(null);
  const addressForRoleRef = useRef<'client' | 'cook' | null>(null);

  const [specs, setSpecs] = useState<Record<string, boolean>>({});
  const [deliveryMethods, setDeliveryMethods] = useState<Record<string, boolean>>({});
  const [bio, setBio] = useState('');

  function toggleSpec(key: string) {
    setSpecs((s) => ({ ...s, [key]: !s[key] }));
  }

  function toggleDeliveryMethod(key: string) {
    setDeliveryMethods((s) => ({ ...s, [key]: !s[key] }));
  }

  function toggleObjective(key: string) {
    setObjectives((s) => ({ ...s, [key]: !s[key] }));
  }

  useEffect(() => {
    addressForRoleRef.current = addressForRole;
  }, [addressForRole]);

  useEffect(() => {
    const digits = stripCepDigits(cepCliente);
    if (digits.length !== 8) {
      setCepLoading(false);
      setNeedsAddressConfirmClient(false);
      setAddressConfirmed(false);
      setConfirmedForCep(null);
      setAddrLogradouro('');
      setAddrBairro('');
      setAddrLocalidade('');
      setAddrUf('');
      setAddrNumero('');
      setAddrComplemento('');
      if (addressForRoleRef.current === 'client') {
        setAddressModalVisible(false);
        setAddressForRole(null);
      }
      return;
    }
    const ac = new AbortController();
    setCepLoading(true);
    setAddressConfirmed(false);
    setConfirmedForCep(null);
    fetchViaCep(digits, ac.signal)
      .then((r) => {
        if (ac.signal.aborted) return;
        setCepLoading(false);
        if (r.ok) {
          setAddrLogradouro(r.data.logradouro ?? '');
          setAddrBairro(r.data.bairro ?? '');
          setAddrLocalidade(r.data.localidade ?? '');
          setAddrUf((r.data.uf ?? '').slice(0, 2));
          setAddrNumero('');
          setAddrComplemento('');
          setNeedsAddressConfirmClient(true);
          setAddressForRole('client');
          setAddressModalVisible(true);
        } else {
          Alert.alert('CEP', 'Não foi possível localizar este CEP. Verifique e tente novamente.');
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setCepLoading(false);
      });
    return () => ac.abort();
  }, [cepCliente]);

  useEffect(() => {
    const digits = stripCepDigits(cepCook);
    if (digits.length !== 8) {
      setCepLoadingCook(false);
      setNeedsAddressConfirmCook(false);
      setCookAddressConfirmed(false);
      setConfirmedForCepCook(null);
      setCookLogradouro('');
      setCookBairro('');
      setCookLocalidade('');
      setCookUf('');
      setCookNumero('');
      setCookComplemento('');
      if (addressForRoleRef.current === 'cook') {
        setAddressModalVisible(false);
        setAddressForRole(null);
      }
      return;
    }
    const ac = new AbortController();
    setCepLoadingCook(true);
    setCookAddressConfirmed(false);
    setConfirmedForCepCook(null);
    fetchViaCep(digits, ac.signal)
      .then((r) => {
        if (ac.signal.aborted) return;
        setCepLoadingCook(false);
        if (r.ok) {
          setCookLogradouro(r.data.logradouro ?? '');
          setCookBairro(r.data.bairro ?? '');
          setCookLocalidade(r.data.localidade ?? '');
          setCookUf((r.data.uf ?? '').slice(0, 2));
          setCookNumero('');
          setCookComplemento('');
          setNeedsAddressConfirmCook(true);
          setAddressForRole('cook');
          setAddressModalVisible(true);
        } else {
          Alert.alert('CEP', 'Não foi possível localizar este CEP. Verifique e tente novamente.');
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setCepLoadingCook(false);
      });
    return () => ac.abort();
  }, [cepCook]);

  function confirmAddressModal() {
    if (addressForRole === 'client') {
      const digits = stripCepDigits(cepCliente);
      if (digits.length !== 8) return;
      if (!addrNumero.trim()) {
        Alert.alert('Endereço', 'Informe o número do endereço.');
        return;
      }
      setAddressConfirmed(true);
      setConfirmedForCep(digits);
      setNeedsAddressConfirmClient(false);
    } else if (addressForRole === 'cook') {
      const digits = stripCepDigits(cepCook);
      if (digits.length !== 8) return;
      if (!cookNumero.trim()) {
        Alert.alert('Endereço', 'Informe o número do endereço.');
        return;
      }
      setCookAddressConfirmed(true);
      setConfirmedForCepCook(digits);
      setNeedsAddressConfirmCook(false);
    }
    setAddressModalVisible(false);
  }

  function submitClient() {
    const err = validateRegisterCommon({ name, email, phone, password, confirmPassword });
    if (err) {
      Alert.alert('Cadastro', err);
      return;
    }
    const selectedGoals = OBJECTIVES.filter((o) => objectives[o]);
    if (selectedGoals.length === 0) {
      Alert.alert('Cadastro', 'Selecione pelo menos um objetivo principal.');
      return;
    }
    const cepDigits = stripCepDigits(cepCliente);
    if (cepDigits.length !== 8) {
      Alert.alert('Cadastro', 'Informe o CEP com 8 dígitos (00000-000).');
      return;
    }
    if (!addressConfirmed || confirmedForCep !== cepDigits) {
      Alert.alert('Cadastro', 'Busque o CEP e confirme o endereço no pop-up.');
      return;
    }
    signIn('client', {
      displayName: name.trim(),
      email: email.trim(),
    });
    router.push(Routes.orderRecipe);
  }

  function submitCook() {
    const err = validateRegisterCommon({ name, email, phone, password, confirmPassword });
    if (err) {
      Alert.alert('Cadastro', err);
      return;
    }
    const cepCookDigits = stripCepDigits(cepCook);
    if (cepCookDigits.length !== 8) {
      Alert.alert('Cadastro', 'Informe o CEP com 8 dígitos (00000-000).');
      return;
    }
    if (!cookAddressConfirmed || confirmedForCepCook !== cepCookDigits) {
      Alert.alert('Cadastro', 'Busque o CEP e confirme o endereço no pop-up.');
      return;
    }
    const selectedDelivery = DELIVERY_METHODS.filter((m) => deliveryMethods[m.label]);
    if (selectedDelivery.length === 0) {
      Alert.alert('Cadastro', 'Selecione pelo menos uma forma de entrega.');
      return;
    }
    signIn('cook', {
      displayName: name.trim(),
      email: email.trim(),
    });
    router.replace(Routes.cookDashboard);
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <TopNav
          left={<LogoMark onPress={() => router.replace(Routes.tabs)} />}
          right={<Button title="Retornar" variant="ghost" onPress={retornar} />}
        />
      </SafeAreaView>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          style={styles.scroll}>
          <Text style={styles.formTitle}>Criar conta</Text>
          <Text style={styles.formSub}>Escolha seu perfil para personalizar o cadastro</Text>
          <Text style={styles.alreadyAccountLine}>
            <Text style={styles.linkInline} onPress={() => router.push(Routes.login)}>
              Já tenho uma conta
            </Text>
          </Text>

          <View style={styles.profileRow}>
            <Pressable
              onPress={() => setProfile('client')}
              style={[styles.profileCard, profile === 'client' ? styles.profileOn : styles.profileOff]}>
              <Text style={styles.profileEmoji}>🧑</Text>
              <Text style={styles.profileTitle}>Sou cliente</Text>
              <Text style={styles.profileHint}>Quero pedir marmitas</Text>
            </Pressable>
            <Pressable
              onPress={() => setProfile('cook')}
              style={[styles.profileCard, profile === 'cook' ? styles.profileOn : styles.profileOff]}>
              <Text style={styles.profileEmoji}>👨‍🍳</Text>
              <Text style={styles.profileTitle}>Sou cozinheiro</Text>
              <Text style={styles.profileHint}>Quero oferecer marmitas</Text>
            </Pressable>
          </View>

          <LabeledInput label="Nome completo" placeholder="Ex: Maria Silva" value={name} onChangeText={setName} />
          <LabeledInput
            label="E-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="maria@email.com"
            value={email}
            onChangeText={setEmail}
          />
          <LabeledInput
            label="Telefone / WhatsApp"
            keyboardType="number-pad"
            placeholder="(81) 99999-9999"
            value={phone}
            onChangeText={(t) => setPhone(formatBrazilPhoneMask(t))}
            maxLength={16}
          />
          <LabeledInput label="Senha" secureTextEntry placeholder="Mínimo 8 caracteres" value={password} onChangeText={setPassword} />
          <LabeledInput label="Confirmar senha" secureTextEntry placeholder="Repita a senha" value={confirmPassword} onChangeText={setConfirmPassword} />

          {profile === 'client' ? (
            <View>
              <View style={styles.sectionHead}>
                <View style={styles.sectionIcon}>
                  <Text style={styles.sectionIconTxt}>🎯</Text>
                </View>
                <Text style={styles.sectionLabel}>Seu objetivo alimentar</Text>
              </View>
              <Text style={styles.specLabel}>Objetivo principal (selecione todos que se aplicam)</Text>
              <View style={styles.specGrid}>
                {OBJECTIVES.map((o) => (
                  <Pressable
                    key={o}
                    onPress={() => toggleObjective(o)}
                    style={[styles.specChip, objectives[o] && styles.specChipOn]}>
                    <Text style={[styles.specChipText, objectives[o] && styles.specChipTextOn]}>{o}</Text>
                  </Pressable>
                ))}
              </View>
              <LabeledInput
                label="Restrições alimentares (opcional)"
                placeholder="Ex: sem glúten, sem lactose, sem amendoim"
                value={restrictions}
                onChangeText={setRestrictions}
              />
              <LabeledInput
                label="Digite seu CEP"
                keyboardType="number-pad"
                placeholder="00000-000"
                value={cepCliente}
                onChangeText={(t) => setCepCliente(formatBrazilCepMask(t))}
                maxLength={9}
              />
              {cepLoading ? (
                <View style={styles.cepLoading}>
                  <ActivityIndicator color={NutrilhoColors.green} />
                  <Text style={styles.cepLoadingText}>Buscando CEP…</Text>
                </View>
              ) : null}
              {stripCepDigits(cepCliente).length === 8 && (needsAddressConfirmClient || addressConfirmed) ? (
                <Pressable
                  onPress={() => {
                    setAddressForRole('client');
                    setAddressModalVisible(true);
                  }}
                  style={styles.reopenAddr}>
                  <Text style={styles.reopenAddrText}>Revisar endereço</Text>
                </Pressable>
              ) : null}
              <Button title="Criar minha conta" variant="primary" onPress={submitClient} style={styles.btnFull} />
            </View>
          ) : (
            <View>
              <View style={styles.sectionHead}>
                <View style={[styles.sectionIcon, styles.sectionIconCook]}>
                  <Text style={styles.sectionIconTxt}>🍳</Text>
                </View>
                <Text style={styles.sectionLabel}>Informações do cozinheiro</Text>
              </View>
              <LabeledInput
                label="Digite seu CEP"
                keyboardType="number-pad"
                placeholder="00000-000"
                value={cepCook}
                onChangeText={(t) => setCepCook(formatBrazilCepMask(t))}
                maxLength={9}
              />
              {cepLoadingCook ? (
                <View style={styles.cepLoading}>
                  <ActivityIndicator color={NutrilhoColors.green} />
                  <Text style={styles.cepLoadingText}>Buscando CEP…</Text>
                </View>
              ) : null}
              {stripCepDigits(cepCook).length === 8 && (needsAddressConfirmCook || cookAddressConfirmed) ? (
                <Pressable
                  onPress={() => {
                    setAddressForRole('cook');
                    setAddressModalVisible(true);
                  }}
                  style={styles.reopenAddr}>
                  <Text style={styles.reopenAddrText}>Revisar endereço</Text>
                </Pressable>
              ) : null}
              <Text style={styles.specLabel}>Especialidades (selecione todas que se aplicam)</Text>
              <View style={styles.specGrid}>
                {SPECS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => toggleSpec(s)}
                    style={[styles.specChip, specs[s] && styles.specChipOn]}>
                    <Text style={[styles.specChipText, specs[s] && styles.specChipTextOn]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.specLabel}>Formas de entrega (selecione todas que se aplicam)</Text>
              <View style={styles.specGrid}>
                {DELIVERY_METHODS.map((m) => {
                  const on = deliveryMethods[m.label];
                  return (
                    <Pressable
                      key={m.label}
                      onPress={() => toggleDeliveryMethod(m.label)}
                      style={[styles.specChip, styles.deliveryChip, on && styles.specChipOn]}>
                      <Ionicons
                        color={on ? NutrilhoColors.greenD : NutrilhoColors.textM}
                        name={m.icon}
                        size={18}
                      />
                      <Text style={[styles.specChipText, styles.deliveryChipText, on && styles.specChipTextOn]}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <LabeledInput
                label="Sobre você (aparece no seu perfil público)"
                placeholder="Ex: Cozinheira especializada em alimentação saudável há 3 anos..."
                value={bio}
                onChangeText={setBio}
                multiline
                style={styles.textarea}
              />
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  <Text style={styles.noticeBold}>🔒 Verificação posterior:</Text> após o cadastro, nossa equipe entrará em contato via WhatsApp para verificar sua
                  cozinha. Só cozinheiros verificados aparecem no marketplace.
                </Text>
              </View>
              <Button title="Cadastrar como cozinheiro" variant="primary" onPress={submitCook} style={[styles.btnFull, styles.btnCook]} />
            </View>
          )}

          <Text style={styles.footerLine}>
            Já tem conta?{' '}
            <Text style={styles.linkInline} onPress={() => router.push(Routes.login)}>
              Entrar
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        transparent
        visible={addressModalVisible}
        onRequestClose={() => setAddressModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.addrModalRoot}>
          <View style={styles.addrModalInner}>
            <Pressable accessibilityRole="button" style={styles.addrBackdrop} onPress={() => setAddressModalVisible(false)} />
            <View style={styles.addrSheet}>
              <Text style={styles.addrSheetTitle}>
                {addressForRole === 'cook' ? 'Endereço da cozinha' : 'Endereço de entrega'}
              </Text>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {addressForRole === 'cook' ? (
                  <>
                    <LabeledInput label="Logradouro" value={cookLogradouro} onChangeText={setCookLogradouro} placeholder="Rua, avenida…" />
                    <LabeledInput label="Bairro" value={cookBairro} onChangeText={setCookBairro} />
                    <LabeledInput label="Localidade" value={cookLocalidade} onChangeText={setCookLocalidade} placeholder="Cidade" />
                    <LabeledInput
                      label="UF"
                      value={cookUf}
                      onChangeText={(t) => setCookUf(t.slice(0, 2).toUpperCase())}
                      placeholder="SP"
                      maxLength={2}
                      autoCapitalize="characters"
                    />
                    <LabeledInput
                      label="Número (obrigatório)"
                      value={cookNumero}
                      onChangeText={setCookNumero}
                      keyboardType="number-pad"
                      placeholder="Ex: 123"
                    />
                    <LabeledInput
                      label="Complemento"
                      value={cookComplemento}
                      onChangeText={setCookComplemento}
                      placeholder="Apto, bloco… (opcional)"
                    />
                  </>
                ) : addressForRole === 'client' ? (
                  <>
                    <LabeledInput label="Logradouro" value={addrLogradouro} onChangeText={setAddrLogradouro} placeholder="Rua, avenida…" />
                    <LabeledInput label="Bairro" value={addrBairro} onChangeText={setAddrBairro} />
                    <LabeledInput label="Localidade" value={addrLocalidade} onChangeText={setAddrLocalidade} placeholder="Cidade" />
                    <LabeledInput
                      label="UF"
                      value={addrUf}
                      onChangeText={(t) => setAddrUf(t.slice(0, 2).toUpperCase())}
                      placeholder="SP"
                      maxLength={2}
                      autoCapitalize="characters"
                    />
                    <LabeledInput
                      label="Número (obrigatório)"
                      value={addrNumero}
                      onChangeText={setAddrNumero}
                      keyboardType="number-pad"
                      placeholder="Ex: 123"
                    />
                    <LabeledInput
                      label="Complemento"
                      value={addrComplemento}
                      onChangeText={setAddrComplemento}
                      placeholder="Apto, bloco… (opcional)"
                    />
                  </>
                ) : null}
              </ScrollView>
              <Button title="Confirmar endereço" variant="primary" onPress={confirmAddressModal} style={styles.addrConfirmBtn} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NutrilhoColors.beige },
  flex: { flex: 1 },
  safeTop: { backgroundColor: NutrilhoColors.white },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.sectionPadX,
    paddingTop: 20,
    paddingBottom: 40,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  formTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 22,
    fontWeight: '700',
    color: NutrilhoColors.text,
    marginBottom: 6,
  },
  formSub: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textL,
    marginBottom: 8,
  },
  alreadyAccountLine: {
    textAlign: 'center',
    marginBottom: 18,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textL,
  },
  profileRow: { flexDirection: 'row', gap: 9, marginBottom: 20 },
  profileCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
  },
  profileOn: {
    borderColor: NutrilhoColors.green,
    backgroundColor: NutrilhoColors.greenL,
  },
  profileOff: {
    borderColor: NutrilhoColors.beigeMid,
    backgroundColor: NutrilhoColors.white,
  },
  profileEmoji: { fontSize: 22, marginBottom: 6 },
  profileTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: NutrilhoColors.text,
    marginBottom: 4,
  },
  profileHint: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: NutrilhoColors.textL, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 12 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NutrilhoColors.greenL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconCook: { backgroundColor: '#fff3cc' },
  sectionIconTxt: { fontSize: 14 },
  sectionLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: NutrilhoColors.textM,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: NutrilhoColors.textM,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  specChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: NutrilhoColors.beigeMid,
    backgroundColor: NutrilhoColors.white,
  },
  deliveryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryChipText: {
    flexShrink: 1,
  },
  specChipOn: {
    borderColor: NutrilhoColors.green,
    backgroundColor: NutrilhoColors.greenL,
  },
  specChipText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textM,
  },
  specChipTextOn: {
    fontFamily: FontFamily.sansSemiBold,
    color: NutrilhoColors.greenD,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  notice: {
    backgroundColor: NutrilhoColors.greenL,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  noticeText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: NutrilhoColors.greenD,
    lineHeight: 19,
  },
  noticeBold: { fontFamily: FontFamily.sansSemiBold },
  btnFull: { width: '100%', marginTop: 8, paddingVertical: 13 },
  btnCook: { backgroundColor: NutrilhoColors.brownBtn },
  footerLine: {
    textAlign: 'center',
    marginTop: 18,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textL,
  },
  linkInline: {
    fontFamily: FontFamily.sansMedium,
    color: NutrilhoColors.green,
  },
  cepLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -8,
    marginBottom: 12,
  },
  cepLoadingText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textM,
  },
  reopenAddr: { marginTop: -8, marginBottom: 8 },
  reopenAddrText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: NutrilhoColors.green,
  },
  addrModalRoot: { flex: 1 },
  addrModalInner: { flex: 1, justifyContent: 'flex-end' },
  addrBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  addrSheet: {
    zIndex: 1,
    backgroundColor: NutrilhoColors.white,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingHorizontal: Spacing.sectionPadX,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  addrSheetTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 18,
    fontWeight: '700',
    color: NutrilhoColors.text,
    marginBottom: 8,
  },
  addrConfirmBtn: { width: '100%', marginTop: 8, paddingVertical: 13 },
});

/**
 * Cliente — enviar receita (`web-prototype/enviar-receita.html`).
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { FormField } from '@/components/prototype/FormField';
import { useAuth } from '@/contexts/AuthContext';
import { criarSolicitacaoApi } from '@/lib/api';
import { fontSerif, P, radius } from '@/constants/prototypeTheme';

type OpMode = 'foto' | 'form';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'application/pdf']);

export default function EnviarReceitaScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [op, setOp] = useState<OpMode>('foto');
  const [submitting, setSubmitting] = useState(false);

  const [picked, setPicked] = useState<{
    uri: string;
    name: string;
    mimeType?: string | null;
  } | null>(null);

  const [refeicoesPorDia, setRefeicoesPorDia] = useState('');
  const [calorias, setCalorias] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [alimentosProibidos, setAlimentosProibidos] = useState('');
  const [obsNutri, setObsNutri] = useState('');
  const [qtdDias, setQtdDias] = useState('');
  const [porcoes, setPorcoes] = useState('');
  const [obsExtra, setObsExtra] = useState('');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.tipo !== 'cliente') {
      router.replace('/(tabs)');
    }
  }, [authLoading, user, router]);

  const tap = useCallback((fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  }, []);

  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const a = result.assets[0];
      const mime = a.mimeType ?? '';
      if (mime && !ALLOWED_MIME.has(mime)) {
        Alert.alert('Arquivo', 'Use apenas PDF, JPG ou PNG.');
        return;
      }
      if (a.size != null && a.size > MAX_BYTES) {
        Alert.alert('Arquivo', 'O arquivo deve ter no máximo 10MB.');
        return;
      }
      setPicked({
        uri: a.uri,
        name: a.name || 'receita',
        mimeType: a.mimeType,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Arquivo', e instanceof Error ? e.message : 'Não foi possível selecionar.');
    }
  }, []);

  const clearFile = useCallback(() => {
    setPdfPreviewOpen(false);
    setPicked(null);
  }, []);

  const openPdfExternally = useCallback(async () => {
    if (!picked) return;
    try {
      await Linking.openURL(picked.uri);
    } catch (e) {
      Alert.alert('PDF', e instanceof Error ? e.message : 'Não foi possível abrir o arquivo.');
    }
  }, [picked]);

  const fazerPedido = useCallback(async () => {
    setSubmitting(true);
    try {
      const result = await criarSolicitacaoApi({
        modo: op,
        refeicoes_por_dia: refeicoesPorDia.trim(),
        calorias_diarias: calorias.trim(),
        restricoes: restricoes.trim(),
        alimentos_proibidos: alimentosProibidos.trim(),
        observacoes_nutricionista: obsNutri.trim(),
        qtd_dias: qtdDias.trim(),
        porcoes_por_refeicao: porcoes.trim(),
        observacoes_adicionais: obsExtra.trim(),
        file: picked
          ? { uri: picked.uri, name: picked.name, mimeType: picked.mimeType ?? undefined }
          : null,
      });
      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/home');
        return;
      }
      Alert.alert('Pedido', result.error);
    } finally {
      setSubmitting(false);
    }
  }, [
    op,
    refeicoesPorDia,
    calorias,
    restricoes,
    alimentosProibidos,
    obsNutri,
    qtdDias,
    porcoes,
    obsExtra,
    picked,
    router,
  ]);

  if (authLoading || !user || user.tipo !== 'cliente') {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={P.green} />
      </View>
    );
  }

  const isPdf = picked?.mimeType === 'application/pdf' || picked?.name.toLowerCase().endsWith('.pdf');
  const showImagePreview = picked && !isPdf;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topnav}>
        <Pressable
          onPress={() => tap(() => router.back())}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          hitSlop={8}>
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>
        <Text style={styles.navTitle}>Enviar Receita</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.formTitle}>Sua prescrição</Text>
        <Text style={styles.formSub}>Quanto mais detalhes, melhor o cozinheiro prepara suas marmitas.</Text>

        <View style={styles.opRow}>
          <Pressable
            onPress={() => tap(() => setOp('foto'))}
            style={({ pressed }) => [
              styles.opCard,
              op === 'foto' && styles.opCardOn,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.opEmoji}>📷</Text>
            <Text style={[styles.opTitle, op === 'foto' && styles.opTitleOn]}>Foto da receita</Text>
            <Text style={styles.opSub}>Upload de imagem</Text>
          </Pressable>
          <Pressable
            onPress={() => tap(() => setOp('form'))}
            style={({ pressed }) => [
              styles.opCard,
              op === 'form' && styles.opCardOn,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.opEmoji}>📝</Text>
            <Text style={[styles.opTitle, op === 'form' && styles.opTitleOn]}>Formulário</Text>
            <Text style={styles.opSub}>Digitar manualmente</Text>
          </Pressable>
        </View>

        {op === 'foto' ? (
          <View style={styles.areaBlock}>
            {!picked ? (
              <>
                <Pressable
                  onPress={() => tap(() => void pickFile())}
                  style={({ pressed }) => [styles.uploadBox, pressed && styles.pressed]}>
                  <Text style={styles.uploadGlyph}>🖼</Text>
                  <Text style={styles.uploadMain}>Toque para selecionar a foto</Text>
                  <Text style={styles.uploadHint}>JPG, PNG ou PDF — até 10MB</Text>
                </Pressable>
                <Text style={styles.uploadFoot}>A foto vai diretamente para o cozinheiro escolhido</Text>
              </>
            ) : (
              <View style={styles.previewCard}>
                {showImagePreview ? (
                  <Image source={{ uri: picked.uri }} style={styles.previewImg} contentFit="contain" />
                ) : (
                  <View style={styles.pdfBox}>
                    <Text style={styles.pdfIcon}>📄</Text>
                    <Text style={styles.pdfName} numberOfLines={2}>
                      {picked.name}
                    </Text>
                    <Text style={styles.pdfHint}>PDF</Text>
                    <Pressable
                      onPress={() => tap(() => setPdfPreviewOpen(true))}
                      style={({ pressed }) => [styles.pdfViewBtn, pressed && styles.pressed]}>
                      <MaterialIcons name="picture-as-pdf" size={20} color={P.greenD} />
                      <Text style={styles.pdfViewBtnText}>Visualizar documento</Text>
                    </Pressable>
                  </View>
                )}
                <Pressable
                  onPress={() => tap(() => clearFile())}
                  style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}>
                  <Text style={styles.removeBtnText}>Remover arquivo</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.areaBlock}>
            <FormField label="Refeições por dia" placeholder="Ex.: 3" value={refeicoesPorDia} onChangeText={setRefeicoesPorDia} />
            <FormField label="Calorias diárias" placeholder="Ex: 1800" keyboardType="numeric" value={calorias} onChangeText={setCalorias} />
            <FormField label="Restrições e alergias" placeholder="Ex: sem lactose, sem glúten" value={restricoes} onChangeText={setRestricoes} />
            <FormField label="Alimentos proibidos" placeholder="Ex: amendoim, frutos do mar" value={alimentosProibidos} onChangeText={setAlimentosProibidos} />
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Observações do nutricionista</Text>
              <TextInput
                placeholder="Cole aqui as orientações específicas..."
                placeholderTextColor={P.textL}
                style={styles.textarea}
                multiline
                value={obsNutri}
                onChangeText={setObsNutri}
              />
            </View>
          </View>
        )}

        <View style={styles.divider} />

        <FormField label="Quantidade de dias" placeholder="Ex.: 5" value={qtdDias} onChangeText={setQtdDias} />
        <FormField label="Porções por refeição" placeholder="Ex.: 1" value={porcoes} onChangeText={setPorcoes} />
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Observações adicionais (opcional)</Text>
          <TextInput
            placeholder="Ex: sem pimenta, prefiro frango grelhado..."
            placeholderTextColor={P.textL}
            style={styles.textarea}
            multiline
            value={obsExtra}
            onChangeText={setObsExtra}
          />
        </View>

        <Pressable
          onPress={() => tap(() => void fazerPedido())}
          disabled={submitting}
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed, submitting && styles.btnDisabled]}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>Fazer meu pedido</Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal
        visible={pdfPreviewOpen && isPdf && !!picked}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPdfPreviewOpen(false)}>
        <SafeAreaView style={styles.pdfModalSafe} edges={['top', 'bottom']}>
          <View style={styles.pdfModalHeader}>
            <Pressable
              onPress={() => tap(() => setPdfPreviewOpen(false))}
              style={({ pressed }) => [styles.pdfModalClose, pressed && styles.pressed]}
              hitSlop={8}>
              <Text style={styles.pdfModalCloseText}>Fechar</Text>
            </Pressable>
            <Text style={styles.pdfModalTitle} numberOfLines={1}>
              {picked?.name ?? 'Documento'}
            </Text>
            <Pressable
              onPress={() => tap(() => void openPdfExternally())}
              style={({ pressed }) => [styles.pdfModalLink, pressed && styles.pressed]}
              hitSlop={8}>
              <Text style={styles.pdfModalLinkText}>Abrir no app</Text>
            </Pressable>
          </View>
          {picked && isPdf ? (
            Platform.OS === 'web' ? (
              <View style={styles.pdfWebFallback}>
                <Text style={styles.pdfWebFallbackText}>
                  A pré-visualização de PDF no navegador usa o leitor do sistema.
                </Text>
                <Pressable
                  onPress={() => tap(() => void openPdfExternally())}
                  style={({ pressed }) => [styles.pdfViewBtn, styles.pdfWebFallbackBtn, pressed && styles.pressed]}>
                  <MaterialIcons name="open-in-new" size={20} color={P.greenD} />
                  <Text style={styles.pdfViewBtnText}>Abrir PDF</Text>
                </Pressable>
              </View>
            ) : (
              <WebView
                source={{ uri: picked.uri }}
                style={styles.pdfWebView}
                originWhitelist={['*']}
                allowFileAccess
                allowUniversalAccessFromFileURLs
                mixedContentMode="compatibility"
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.pdfLoading}>
                    <ActivityIndicator size="large" color={P.green} />
                  </View>
                )}
                onError={(e) => {
                  console.warn('WebView PDF', e.nativeEvent);
                }}
              />
            )
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: P.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safe: {
    flex: 1,
    backgroundColor: P.beige,
  },
  topnav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    minHeight: 48,
    backgroundColor: P.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.beigeD,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 80,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.green,
  },
  navTitle: {
    fontFamily: fontSerif,
    fontSize: 15,
    fontWeight: '700',
    color: P.text,
  },
  navSpacer: {
    width: 70,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 21,
    paddingTop: 22,
    paddingBottom: 32,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  formTitle: {
    fontFamily: fontSerif,
    fontSize: 20,
    fontWeight: '700',
    color: P.text,
    marginBottom: 6,
  },
  formSub: {
    fontSize: 13,
    color: P.textL,
    marginBottom: 18,
    lineHeight: 20,
  },
  opRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 20,
  },
  opCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: P.beigeMid,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: P.white,
  },
  opCardOn: {
    borderColor: P.green,
    backgroundColor: P.greenL,
  },
  opEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  opTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: P.text,
    marginBottom: 2,
  },
  opTitleOn: {
    color: P.greenD,
  },
  opSub: {
    fontSize: 11,
    color: P.textL,
  },
  areaBlock: {
    marginBottom: 4,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: P.white,
  },
  uploadGlyph: {
    fontSize: 34,
    marginBottom: 8,
  },
  uploadMain: {
    fontSize: 14,
    fontWeight: '600',
    color: P.text,
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: P.textL,
  },
  uploadFoot: {
    fontSize: 11,
    color: P.textL,
    textAlign: 'center',
    marginTop: 8,
  },
  previewCard: {
    backgroundColor: P.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.beigeD,
    overflow: 'hidden',
  },
  previewImg: {
    width: '100%',
    height: 220,
    backgroundColor: P.beige,
  },
  pdfBox: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pdfIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  pdfName: {
    fontSize: 14,
    fontWeight: '600',
    color: P.text,
    textAlign: 'center',
  },
  pdfHint: {
    fontSize: 12,
    color: P.textL,
    marginTop: 4,
  },
  pdfViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: P.greenL,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.green,
  },
  pdfViewBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.greenD,
  },
  pdfModalSafe: {
    flex: 1,
    backgroundColor: P.white,
  },
  pdfModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.beigeD,
    backgroundColor: P.white,
  },
  pdfModalClose: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 72,
  },
  pdfModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: P.green,
  },
  pdfModalTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: P.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  pdfModalLink: {
    paddingVertical: 6,
    minWidth: 100,
    alignItems: 'flex-end',
  },
  pdfModalLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.textM,
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: P.beige,
  },
  pdfLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.beige,
  },
  pdfWebFallback: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: P.cream,
  },
  pdfWebFallbackText: {
    fontSize: 14,
    color: P.textM,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  pdfWebFallbackBtn: {
    marginTop: 0,
  },
  removeBtn: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.beigeD,
    alignItems: 'center',
  },
  removeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: P.brownBtn,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: P.textM,
    marginBottom: 6,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  textarea: {
    minHeight: 100,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: P.beigeMid,
    borderRadius: radius.md,
    backgroundColor: P.white,
    fontSize: 14,
    color: P.text,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: P.beigeD,
    marginVertical: 18,
  },
  btnPrimary: {
    marginTop: 8,
    backgroundColor: P.green,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.75,
  },
  pressed: {
    opacity: 0.9,
  },
});

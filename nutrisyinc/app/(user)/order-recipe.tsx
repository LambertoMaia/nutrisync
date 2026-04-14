import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavBackButton } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { LabeledInput } from '@/components/ui/labeled-input';
import { SelectField } from '@/components/ui/select-field';
import { Routes } from '@/constants/routes';
import { FontFamily, NutrilhoColors, Spacing } from '@/constants/theme';

const MEALS = ['3 refeições', '4 refeições', '5 refeições', '6 refeições'] as const;
const DAYS = ['5 dias (seg–sex)', '7 dias (semana completa)', '3 dias'] as const;
const PORTIONS = ['1 porção', '2 porções'] as const;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function isAllowedRecipeFile(fileName: string, mimeType?: string | null): boolean {
  if (mimeType && ALLOWED_MIME.has(mimeType)) return true;
  return /\.(jpe?g|png|pdf)$/i.test(fileName);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function OrderRecipeScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'foto' | 'form'>('foto');

  const [mealsPerDay, setMealsPerDay] = useState<string>(MEALS[0]);
  const [calories, setCalories] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [forbidden, setForbidden] = useState('');
  const [nutriNotes, setNutriNotes] = useState('');

  const [days, setDays] = useState<string>(DAYS[0]);
  const [portions, setPortions] = useState<string>(PORTIONS[0]);
  const [extraNotes, setExtraNotes] = useState('');

  const [recipeFile, setRecipeFile] = useState<{ name: string; size: number; mimeType?: string } | null>(null);
  const [pickingFile, setPickingFile] = useState(false);

  function clearRecipeFile() {
    setRecipeFile(null);
  }

  async function pickRecipeFile() {
    if (recipeFile) return;
    try {
      setPickingFile(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      if (asset.size != null && asset.size > MAX_FILE_BYTES) {
        Alert.alert('Arquivo grande demais', 'O arquivo deve ter no máximo 10 MB.');
        return;
      }
      if (!isAllowedRecipeFile(asset.name, asset.mimeType)) {
        Alert.alert('Tipo não permitido', 'Use apenas JPG, PNG ou PDF.');
        return;
      }
      // Demo: no upload to a server
      setRecipeFile({
        name: asset.name,
        size: asset.size ?? 0,
        mimeType: asset.mimeType,
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo.');
    } finally {
      setPickingFile(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topBar}>
          <NavBackButton />
          <Text style={styles.topTitle}>Enviar Receita</Text>
          <View style={styles.topSpacer} />
        </View>
      </SafeAreaView>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          style={styles.scroll}>
          <Text style={styles.formTitle}>Sua prescrição</Text>
          <Text style={styles.formSub}>Quanto mais detalhes, melhor o cozinheiro prepara suas marmitas.</Text>

          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode('foto')}
              style={[styles.modeCard, mode === 'foto' ? styles.modeOn : styles.modeOff]}>
              <Text style={styles.modeEmoji}>📷</Text>
              <Text style={[styles.modeTitle, mode === 'foto' && styles.modeTitleOn]}>Foto da receita</Text>
              <Text style={styles.modeHint}>Upload de arquivo</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('form')}
              style={[styles.modeCard, mode === 'form' ? styles.modeOn : styles.modeOff]}>
              <Text style={styles.modeEmoji}>📝</Text>
              <Text style={[styles.modeTitle, mode === 'form' && styles.modeTitleOn]}>Formulário</Text>
              <Text style={styles.modeHint}>Digitar manualmente</Text>
            </Pressable>
          </View>

          {mode === 'foto' ? (
            <View>
              {!recipeFile ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar arquivo da receita"
                  disabled={pickingFile}
                  onPress={pickRecipeFile}
                  style={({ pressed }) => [
                    styles.uploadBox,
                    pressed && styles.uploadBoxPressed,
                    pickingFile && styles.uploadBoxDisabled,
                  ]}>
                  {pickingFile ? (
                    <ActivityIndicator color={NutrilhoColors.green} style={styles.uploadSpinner} />
                  ) : (
                    <Text style={styles.uploadIcon}>📎</Text>
                  )}
                  <Text style={styles.uploadP}>Toque para selecionar o arquivo</Text>
                  <Text style={styles.uploadSpan}>JPG, PNG ou PDF — até 10 MB</Text>
                </Pressable>
              ) : (
                <View style={styles.uploadOk}>
                  <View style={styles.uploadOkHeader}>
                    <View style={styles.uploadOkHeaderText}>
                      <Text style={styles.uploadOkName} numberOfLines={2}>
                        {recipeFile.name}
                      </Text>
                      <Text style={styles.uploadOkMeta}>
                        {formatFileSize(recipeFile.size)}
                        {recipeFile.mimeType ? ` · ${recipeFile.mimeType}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Remover arquivo"
                      accessibilityRole="button"
                      hitSlop={12}
                      onPress={clearRecipeFile}
                      style={({ pressed }) => [styles.removeFileBtn, pressed && styles.removeFileBtnPressed]}>
                      <Ionicons color={NutrilhoColors.textM} name="close-circle" size={28} />
                    </Pressable>
                  </View>
                  <Text style={styles.uploadOkDemo}>Recebido (demo — sem envio ao servidor)</Text>
                </View>
              )}
              <Text style={styles.uploadFoot}>O arquivo vai diretamente para o cozinheiro escolhido</Text>
            </View>
          ) : (
            <View>
              <SelectField label="Refeições por dia" value={mealsPerDay} options={[...MEALS]} onChange={setMealsPerDay} />
              <LabeledInput
                label="Calorias diárias"
                keyboardType="number-pad"
                placeholder="Ex: 1800 kcal"
                value={calories}
                onChangeText={setCalories}
              />
              <LabeledInput
                label="Restrições e alergias"
                placeholder="Ex: sem lactose, sem glúten"
                value={restrictions}
                onChangeText={setRestrictions}
              />
              <LabeledInput
                label="Alimentos proibidos"
                placeholder="Ex: amendoim, frutos do mar"
                value={forbidden}
                onChangeText={setForbidden}
              />
              <LabeledInput
                label="Observações do nutricionista"
                placeholder="Cole aqui as orientações específicas..."
                value={nutriNotes}
                onChangeText={setNutriNotes}
                multiline
                style={styles.textarea}
              />
            </View>
          )}

          <View style={styles.divider} />

          <SelectField label="Quantidade de dias" value={days} options={[...DAYS]} onChange={setDays} />
          <SelectField label="Porções por refeição" value={portions} options={[...PORTIONS]} onChange={setPortions} />
          <LabeledInput
            label="Observações adicionais (opcional)"
            placeholder="Ex: sem pimenta, prefiro frango grelhado..."
            value={extraNotes}
            onChangeText={setExtraNotes}
            multiline
            style={styles.textarea}
          />

          <Button
            title="Publicar minha receita"
            variant="primary"
            onPress={() => router.push(Routes.marketplace)}
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NutrilhoColors.beige },
  flex: { flex: 1 },
  safeTop: { backgroundColor: NutrilhoColors.white },
  topBar: {
    height: 62,
    paddingHorizontal: Spacing.navPadX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 15,
    fontWeight: '700',
    color: NutrilhoColors.text,
  },
  topSpacer: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.sectionPadX,
    paddingTop: 20,
    paddingBottom: 36,
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
    marginBottom: 18,
  },
  modeRow: { flexDirection: 'row', gap: 9, marginBottom: 20 },
  modeCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
  },
  modeOn: {
    borderColor: NutrilhoColors.green,
    backgroundColor: NutrilhoColors.greenL,
  },
  modeOff: {
    borderColor: NutrilhoColors.beigeMid,
    backgroundColor: NutrilhoColors.white,
  },
  modeEmoji: { fontSize: 20, marginBottom: 6 },
  modeTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: NutrilhoColors.text,
    marginBottom: 4,
  },
  modeTitleOn: { color: NutrilhoColors.greenD },
  modeHint: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: NutrilhoColors.textL },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: NutrilhoColors.beigeMid,
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    backgroundColor: NutrilhoColors.white,
  },
  uploadBoxPressed: { opacity: 0.92 },
  uploadBoxDisabled: { opacity: 0.75 },
  uploadSpinner: { marginBottom: 12 },
  uploadIcon: { fontSize: 34, marginBottom: 8 },
  uploadOk: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: NutrilhoColors.greenL,
    borderWidth: 1,
    borderColor: NutrilhoColors.green,
  },
  uploadOkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  uploadOkHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  removeFileBtn: {
    padding: 2,
    marginTop: -2,
    marginRight: -2,
  },
  removeFileBtnPressed: { opacity: 0.7 },
  uploadOkName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: NutrilhoColors.greenD,
    marginBottom: 4,
  },
  uploadOkMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: NutrilhoColors.textM,
  },
  uploadOkDemo: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: NutrilhoColors.textL,
    fontStyle: 'italic',
    marginTop: 10,
  },
  uploadP: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: NutrilhoColors.textL,
    marginBottom: 6,
  },
  uploadSpan: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: NutrilhoColors.green,
  },
  uploadFoot: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: NutrilhoColors.textL,
    textAlign: 'center',
    marginTop: 8,
  },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  divider: {
    height: 1,
    backgroundColor: NutrilhoColors.beigeD,
    marginVertical: 18,
  },
  cta: { width: '100%', marginTop: 12, paddingVertical: 13 },
});

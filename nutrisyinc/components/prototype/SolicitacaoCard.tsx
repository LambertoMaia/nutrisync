import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { P, radius } from '@/constants/prototypeTheme';
import type { SolicitacaoAbertaJson } from '@/lib/api';

type Props = {
  solicitacao: SolicitacaoAbertaJson;
  onPress: () => void;
  /** Variante mais enxuta usada na home (“Oportunidades”). */
  compact?: boolean;
};

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function tempoRelativo(iso: string | null): string {
  if (!iso) return '';
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return '';
  const diffMs = Date.now() - created.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
}

export function SolicitacaoCard({ solicitacao: s, onPress, compact }: Props) {
  const tags: string[] = [];
  if (s.restricoes) tags.push(s.restricoes);
  if (s.alimentos_proibidos) tags.push(`Sem ${s.alimentos_proibidos}`);

  const dias = s.qtd_dias ?? 0;
  const refs = s.refeicoes_por_dia ?? 0;
  const resumo =
    dias > 0 && refs > 0
      ? `${dias} dias · ${refs} refeições/dia`
      : dias > 0
        ? `${dias} dias`
        : refs > 0
          ? `${refs} refeições/dia`
          : 'Detalhes a combinar';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && styles.cardPressed,
      ]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.id}>
            Solicitação #{s.id} · {tempoRelativo(s.criado_em_iso) || s.data}
          </Text>
          <Text style={styles.user}>{s.cliente_nome}</Text>
        </View>
        {s.ja_tem_proposta_minha ? (
          <View style={[styles.badge, { backgroundColor: P.successBg }]}>
            <Text style={[styles.badgeText, { color: P.successText }]}>Já respondida</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: P.greenL }]}>
            <Text style={[styles.badgeText, { color: P.greenD }]}>Aguardando</Text>
          </View>
        )}
      </View>

      <Text style={styles.resumo}>{resumo}</Text>
      {s.calorias_diarias ? (
        <Text style={styles.resumoMuted}>{s.calorias_diarias} kcal/dia</Text>
      ) : null}

      {tags.length > 0 ? (
        <View style={styles.tags}>
          {tags.map((t, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>
                {t}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {!compact && s.observacoes_nutricionista ? (
        <Text style={styles.obs} numberOfLines={2}>
          {s.observacoes_nutricionista}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {s.receita_link ? (
            <View style={styles.footerChip}>
              <MaterialIcons name="attach-file" size={13} color={P.textM} />
              <Text style={styles.footerChipText}>Receita anexa</Text>
            </View>
          ) : null}
          {s.total_propostas > 0 ? (
            <View style={styles.footerChip}>
              <MaterialIcons name="groups" size={13} color={P.textM} />
              <Text style={styles.footerChipText}>
                {s.total_propostas} proposta{s.total_propostas > 1 ? 's' : ''}
              </Text>
            </View>
          ) : null}
          {s.cliente_distancia_bucket ? (
            <View style={[styles.footerChip, styles.footerChipGeo]}>
              <MaterialIcons name="place" size={13} color={P.greenD} />
              <Text style={[styles.footerChipText, styles.footerChipTextGeo]}>
                {s.cliente_distancia_bucket}
              </Text>
            </View>
          ) : null}
        </View>
        {s.minha_proposta ? (
          <Text style={styles.minhaValor}>
            Minha: {formatBrl(Number(s.minha_proposta.valor) || 0)}
          </Text>
        ) : (
          <MaterialIcons name="chevron-right" size={22} color={P.textL} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  cardCompact: { paddingVertical: 12 },
  cardPressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: { flex: 1, paddingRight: 8 },
  id: { fontSize: 12, color: P.textL },
  user: { fontSize: 16, fontWeight: '600', color: P.text, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  resumo: { fontSize: 13, color: P.textM, marginTop: 10 },
  resumoMuted: { fontSize: 12, color: P.textL, marginTop: 2 },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: P.cream,
    borderWidth: 1,
    borderColor: P.beigeD,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  tagText: { fontSize: 11, color: P.textM },
  obs: { fontSize: 12, color: P.textL, marginTop: 10, lineHeight: 18 },
  footer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerLeft: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1 },
  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.beige,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  footerChipText: { fontSize: 11, color: P.textM, fontWeight: '500' },
  footerChipGeo: { backgroundColor: P.greenL },
  footerChipTextGeo: { color: P.greenD, fontWeight: '600' },
  minhaValor: { fontSize: 12, fontWeight: '600', color: P.greenD },
});

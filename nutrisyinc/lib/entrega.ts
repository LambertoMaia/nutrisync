/**
 * Helpers visuais compartilhados para renderizar a forma de entrega escolhida
 * pelo cliente em cards de pedido (home + meus-pedidos) e no modal de
 * proposta. Espelha o catálogo canônico definido em `lib/api.ts`
 * (`EntregaOpcaoId`) e a lógica do backend em `_construir_opciones_entrega`.
 *
 * Mantive aqui — e não em `lib/api.ts` — porque estes helpers assumem uma
 * dependência visual (`@expo/vector-icons`) que não deve sangrar para
 * chamadas puramente de rede.
 */
import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

import type { EntregaOpcaoId } from '@/lib/api';

export function iconForEntregaOpcao(
  id: string | null | undefined,
): ComponentProps<typeof MaterialIcons>['name'] {
  const m: Partial<Record<string, ComponentProps<typeof MaterialIcons>['name']>> = {
    retirada: 'storefront',
    motoboy: 'delivery-dining',
    uber: 'local-taxi',
    parceiros: 'restaurant',
  };
  if (id && m[id]) return m[id]!;
  return 'local-shipping';
}

/**
 * Linha resumo da entrega de um pedido em andamento (`PLAN §9.4`).
 * Retorna `null` quando o pedido ainda não tem `entrega_opcao` definida —
 * pedidos legados anteriores ao catálogo ficam sem esta linha.
 */
export function pedidoEntregaResumo(p: {
  entrega_opcao?: EntregaOpcaoId | null;
  entrega_label?: string | null;
  taxa_entrega?: number | null;
  tempo_entrega_min?: number | null;
}): string | null {
  const op = p.entrega_opcao;
  if (!op) return null;
  const label = p.entrega_label?.trim() || op;
  const taxa = typeof p.taxa_entrega === 'number' ? p.taxa_entrega : 0;
  const parts: string[] = [label];
  if (op === 'retirada') {
    parts.push('sem taxa');
  } else if (taxa > 0) {
    parts.push(`+ R$ ${taxa.toFixed(2)}`);
  }
  if (op === 'motoboy' && p.tempo_entrega_min != null) {
    parts.push(`~${p.tempo_entrega_min} min`);
  }
  return parts.join(' · ');
}

/**
 * Formata distância precisa (km) para UI do cliente. Retorna `null`
 * quando não há geo — a UI deve omitir a linha em vez de exibir `0 km`.
 * (PLAN §10)
 */
export function formatDistanciaKm(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km) || km < 0) return null;
  if (km < 1) return `${Math.round(km * 1000)} m de você`;
  if (km < 10) return `${km.toFixed(1)} km de você`;
  return `${Math.round(km)} km de você`;
}


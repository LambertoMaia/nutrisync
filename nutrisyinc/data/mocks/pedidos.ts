import type { Pedido } from '@/types/models';

/** Interim data — replace with `lib/api` fetch when backend exists. */
export const mockPedidos: Pedido[] = [
  {
    id: '#4821',
    userName: 'Ana Costa',
    info: 'Marmitas semana 14/04 — almoço e jantar · entrega zona sul.',
    status: 'prep',
    receitaLabel: 'Receita do nutricionista',
    receitaBody: 'Plano 1.600 kcal, sem lactose. Refeições conforme prescrição enviada.',
  },
  {
    id: '#4810',
    userName: 'Pedro Lima',
    info: 'Pedido único — teste cardápio sugerido.',
    status: 'done',
  },
  {
    id: '#4829',
    userName: 'Nova solicitação',
    info: 'Aguardando aceite do cozinheiro.',
    status: 'new',
    receitaLabel: 'Observações',
    receitaBody: 'Preferir frango no almoço às segundas.',
  },
];

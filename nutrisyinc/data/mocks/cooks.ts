import type { Cook } from '@/types/models';

/** Interim data — replace with `lib/api` fetch when backend exists. */
export const mockCooks: Cook[] = [
  {
    id: 'c1',
    name: 'Maria Silva',
    location: 'São Paulo · 4,8 km',
    tags: ['Low carb', 'Sem glúten'],
    emoji: '👩‍🍳',
    ratingLabel: '★ 4,9',
    priceLabel: 'A partir de R$ 42',
    highlightFirstTag: true,
  },
  {
    id: 'c2',
    name: 'João Prado',
    location: 'São Paulo · 6,2 km',
    tags: ['Fit', 'Alto teor proteico'],
    emoji: '👨‍🍳',
    ratingLabel: '★ 4,7',
    priceLabel: 'A partir de R$ 38',
  },
];

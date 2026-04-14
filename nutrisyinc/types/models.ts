/**
 * Domain shapes for UI and future API integration (Nutrilho).
 */

export type UserRole = 'client' | 'cook';

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

export interface Cook {
  id: string;
  name: string;
  location: string;
  tags: string[];
  /** Placeholder visual when no image URL is available */
  emoji?: string;
  ratingLabel: string;
  priceLabel: string;
  /** When true, first tag uses highlight (green) styling */
  highlightFirstTag?: boolean;
}

export type PedidoStatus = 'new' | 'prep' | 'done';

export interface Pedido {
  id: string;
  userName: string;
  info: string;
  status: PedidoStatus;
  receitaLabel?: string;
  receitaBody?: string;
}

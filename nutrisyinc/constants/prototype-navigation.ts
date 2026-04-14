/**
 * Maps `web-prototype/scripts.js` `pageMap` keys to Expo Router hrefs.
 * Use `usePrototypeNavigation()` for `go` / `nav` parity with the static prototype.
 */
import { Routes } from '@/constants/routes';

export const prototypeScreenHref = {
  's-home': Routes.tabs,
  's-cadastro': Routes.register,
  's-login': Routes.login,
  /** Until a dedicated home-user route exists, same shell as marketing home. */
  's-home-user': Routes.tabs,
  's-enviar-receita': Routes.orderRecipe,
  's-cozinheiros': Routes.marketplace,
  's-confirmar': Routes.confirmOrder,
  's-status': Routes.orderStatus,
  's-painel-cook': Routes.cookDashboard,
  's-pedidos': Routes.orders,
  /** Prototype screen not yet ported — closest flow. */
  's-avaliacao': Routes.orderStatus,
  's-perfil': Routes.profile,
  's-sem-receita': Routes.cardapios,
} as const;

export type PrototypeScreenId = keyof typeof prototypeScreenHref;

export function isPrototypeScreenId(id: string): id is PrototypeScreenId {
  return id in prototypeScreenHref;
}

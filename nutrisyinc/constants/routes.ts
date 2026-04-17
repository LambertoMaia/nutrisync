/**
 * Expo Router paths (groups like `(auth)` do not appear in the URL).
 * Use these for `router.push` / `href` to avoid typos.
 */
export const Routes = {
  splash: '/',
  tabs: '/(tabs)',
  home: '/(tabs)',
  explore: '/explore',
  orders: '/orders',
  profile: '/profile',
  login: '/login',
  forgotPassword: '/forgot-password',
  register: '/register',
  orderRecipe: '/order-recipe',
  /** Cardápios sugeridos (web-prototype/cardapios.html, s-sem-receita) */
  cardapios: '/cardapios',
  marketplace: '/marketplace',
  confirmOrder: '/confirm-order',
  orderStatus: '/order-status',
  cookDashboard: '/dashboard',
  /** Perfil cliente (protótipo `perfil.html`) */
  userPerfil: '/(user)/perfil',
  /** Histórico de pedidos entregues + avaliação */
  receitasEnviadas: '/(user)/receitas-enviadas',
} as const;

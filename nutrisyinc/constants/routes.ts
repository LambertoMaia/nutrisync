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
  marketplace: '/(user)/marketplace',
  confirmOrder: '/confirm-order',
  orderStatus: '/order-status',
  cookDashboard: '/dashboard',
  /** Histórico de pedidos do cozinheiro (entregues/cancelados) */
  cookHistorico: '/(cook)/historico',
  /** Perfil do cozinheiro (dados da conta + resumo) */
  cookPerfil: '/(cook)/perfil',
  /** Descoberta de solicitações abertas (painel do cozinheiro) */
  cookSolicitacoes: '/(cook)/solicitacoes',
  /** Detalhe de uma solicitação aberta + envio de proposta */
  cookSolicitacaoDetalhe: (id: number | string) =>
    ({
      pathname: '/(cook)/solicitacao/[id]',
      params: { id: String(id) },
    }) as const,
  /** Perfil cliente (protótipo `perfil.html`) */
  userPerfil: '/(user)/perfil',
  /** Histórico de pedidos entregues + avaliação */
  receitasEnviadas: '/(user)/receitas-enviadas',
} as const;

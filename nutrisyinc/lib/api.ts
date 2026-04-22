/**
 * HTTP API for the Flask backend (nutrilho repo: `src/app.py`).
 *
 * **Recommended (phone + PC without LAN hassle):** run Flask locally, expose it with **ngrok**
 * (`ngrok http 5000`), then set in `.env`:
 * `EXPO_PUBLIC_API_URL=https://YOUR_SUBDOMAIN.ngrok-free.app`
 * (HTTPS, no trailing slash). Restart Expo after changing env (`npx expo start -c`).
 *
 * Alternatives: LAN IP (`http://192.168.x.x:5000`), Android emulator `http://10.0.2.2:5000`.
 */

export function getApiBaseUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
      ? String(process.env.EXPO_PUBLIC_API_URL).trim()
      : '';
  const base = fromEnv || 'http://localhost:5000';
  return base.replace(/\/$/, '');
}

/** Prefix relative `/api/uploads/...` paths for `Image` / `Linking`. */
export function resolvePublicMediaUrl(link: string | null | undefined): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = getApiBaseUrl().replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

/** User-facing message when fetch throws (wrong URL, server down, no Wi‑Fi, etc.). */
export function getNetworkFailureMessage(caught: unknown): string {
  const base = getApiBaseUrl();
  const detail = caught instanceof Error && caught.message ? ` (${caught.message})` : '';
  const local =
    /\blocalhost\b/i.test(base) || /^https?:\/\/127\./i.test(base) || /^https?:\/\/10\.0\.2\.2/i.test(base);
  const ngrok = /ngrok/i.test(base);
  let deviceHint: string;
  if (ngrok) {
    deviceHint =
      '\n\nConfira: túnel ngrok ativo (`ngrok http <porta>`), URL em EXPO_PUBLIC_API_URL igual à mostrada no ngrok (HTTPS, sem barra no fim), backend escutando na mesma porta. Reinicie o Expo após mudar o .env.';
  } else if (local) {
    deviceHint =
      '\n\nEm celular ou tablet, localhost não aponta para o seu PC. Opções: use **ngrok** e EXPO_PUBLIC_API_URL=https://….ngrok-free.app, ou defina o IP da rede em .env. Reinicie o Expo: npx expo start -c';
  } else {
    deviceHint = '\n\nConfira se o Flask está rodando, a porta está certa e o firewall permite conexões.';
  }
  return `Não foi possível conectar ao servidor em:\n${base}${detail}${deviceHint}`;
}

export type RegisterClientePayload = {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmar_senha: string;
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  numero: string;
  complemento: string;
  restricao: string;
  objetivos: string[];
};

export type RegisterCozinheiroPayload = {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmar_senha: string;
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  numero: string;
  complemento: string;
  especialidades: string[];
  sobre_voce: string;
  /** Alinhado a `nutrilho` `validation._build_cozinheiro_cadastro` — opcional (padrão no servidor: null). */
  tipo_entrega?: 'delivery' | 'retirada' | 'ambos';
};

export type RegisterSuccessJson = {
  success: true;
  message?: string;
  usuario_id: number;
  usuario_tipo: string;
  usuario_nome: string;
  usuario_email: string;
};

export type RegisterErrorJson = {
  success: false;
  error: string;
  error_code?: string;
};

export type RegisterResult =
  | { ok: true; data: RegisterSuccessJson }
  | { ok: false; error: string; error_code?: string; status: number };

export type LoginPayload = {
  email: string;
  senha: string;
  tipo: 'cliente' | 'cozinheiro';
};

export type LoginSuccessJson = {
  success: true;
  message?: string;
  usuario_id: number;
  usuario_tipo: string;
  usuario_nome: string;
  usuario_email: string;
  redirect?: string;
};

export type LoginResult =
  | { ok: true; data: LoginSuccessJson }
  | { ok: false; error: string; status: number };

const isDev =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

function redactRegisterPayload(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...p };
  if ('senha' in out) out.senha = '***';
  if ('confirmar_senha' in out) out.confirmar_senha = '***';
  return out;
}

/** Parse API body: JSON object, or surface HTML/plain text (e.g. ngrok interstitial) for debugging. */
function parseJsonBody<T extends object>(rawText: string, status: number): { data: T; parseNote?: string } {
  const t = rawText.trim();
  if (!t) {
    return { data: {} as T, parseNote: `Resposta vazia (HTTP ${status}).` };
  }
  const head = t.slice(0, 64).toLowerCase();
  if (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    (t.startsWith('<') && t.toLowerCase().includes('<body'))
  ) {
    return {
      data: {} as T,
      parseNote: `O servidor devolveu HTML em vez de JSON (HTTP ${status}). Com ngrok, confira o header ngrok-skip-browser-warning e a URL em EXPO_PUBLIC_API_URL. Início: ${t.slice(0, 120).replace(/\s+/g, ' ')}…`,
    };
  }
  try {
    const data = JSON.parse(rawText) as T;
    return { data };
  } catch {
    return {
      data: {} as T,
      parseNote: `Resposta não é JSON válido (HTTP ${status}): ${t.slice(0, 240)}${t.length > 240 ? '…' : ''}`,
    };
  }
}

/** GET/HEAD requests — Accept + optional ngrok header (no Content-Type). */
export function getApiHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
  };
  if (/ngrok/i.test(getApiBaseUrl())) {
    h['ngrok-skip-browser-warning'] = 'true';
  }
  return h;
}

/** POST JSON body; ngrok free tier may need the skip-browser-warning header on some clients. */
export function getApiJsonHeaders(): Record<string, string> {
  return { ...getApiHeaders(), 'Content-Type': 'application/json' };
}

async function getJsonRaw(path: string): Promise<{ res: Response; rawText: string }> {
  const url = `${getApiBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getApiHeaders(),
    credentials: 'include',
  });
  const rawText = await res.text();
  return { res, rawText };
}

export type VerificarLoginJson =
  | { logado: true; usuario_id: number; usuario_tipo: string; usuario_nome: string; usuario_email?: string | null }
  | { logado: false };

export type PerfilClienteJson = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cep: string;
  rua: string;
  numero: number;
  complemento: string | null;
  restricao: string | null;
  tipo: 'cliente';
};

/** `GET /api/perfil` quando usuario_tipo === 'cozinheiro'. */
export type PerfilCozinheiroJson = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cep: string;
  rua: string;
  numero: number;
  complemento: string | null;
  sobre_voce: string | null;
  tipo_entrega: string | null;
  especialidade_id: number | null;
  /** `null` = não oferece moto-boy próprio; habilita a opção `motoboy` na proposta. */
  taxa_motoboy: number | null;
  aceita_parceiros: boolean;
  taxa_parceiros: number | null;
  tipo: 'cozinheiro';
};

/** Ids canônicos das formas de entrega (ver `PLAN_USUARIO.md §9.1`). */
export type EntregaOpcaoId = 'retirada' | 'motoboy' | 'uber' | 'parceiros';

export type EntregaOpcaoJson = {
  id: EntregaOpcaoId;
  label: string;
  taxa: number;
  estimativa?: boolean;
};

export type PedidoClienteAtivoJson = {
  id: number;
  cozinheiro_nome: string;
  cozinheiro_id: number;
  status: string;
  data: string;
  hora: string;
  qtd_marmitas: number;
  valor_total: number;
  avaliacao: number;
  marmita_nome: string;
  proposta_id: number | null;
  proposta: { id: number; valor: number; receita_link: string | null } | null;
  tipo?: 'pedido';
  criado_em_iso?: string;
  /** Forma de entrega escolhida no aceite da proposta. Opcional para pedidos legados. */
  entrega_opcao?: EntregaOpcaoId | null;
  entrega_label?: string | null;
  taxa_entrega?: number | null;
  /** Só faz sentido quando `entrega_opcao === 'motoboy'`. */
  tempo_entrega_min?: number | null;
  /** Estado do checkout fake (PLAN_USUARIO §12). `pendente` por padrão. */
  status_pagamento?: StatusPagamento;
  metodo_pagamento?: MetodoPagamento | null;
};

export type StatusPagamento = 'pendente' | 'pago' | 'falhou';
export type MetodoPagamento = 'pix' | 'credito' | 'debito';

/** Snapshot do pagamento retornado pelos endpoints `POST /pagamento/*`. */
export type PagamentoJson = {
  pedido_id: number;
  status_pagamento: StatusPagamento;
  metodo_pagamento: MetodoPagamento | null;
  pix_copia_cola: string | null;
  pagamento_data: string | null;
  valor: number;
};

/** Histórico completo (`GET /api/pedidos/cliente/<id>`), incl. entregues e `pode_avaliar`. */
export type PedidoClienteHistoricoJson = PedidoClienteAtivoJson & {
  pode_avaliar?: boolean;
};

export type SolicitacaoClienteJson = {
  tipo: 'solicitacao';
  id: number;
  situacao: string;
  data: string;
  hora: string;
  criado_em_iso?: string;
  receita_link: string | null;
  demo_convite_recusado: boolean;
  proposta_pendente: {
    id: number;
    valor: number;
    /** Presente quando o backend expõe o campo (nutrilho ≥ PLAN_USUARIO). */
    cozinheiro_id?: number;
    cozinheiro_nome: string;
    tipo_entrega: string;
    /** Preço base antes da taxa de entrega */
    base_valor?: number;
    opciones_entrega?: EntregaOpcaoJson[];
    /** Minutos prometidos para moto-boy. `null` quando cozinheiro não oferece ou cliente escolherá retirada. */
    tempo_entrega_min?: number | null;
    /** Distância precisa cliente ↔ cozinheiro em km (PLAN §10). `null` se algum lado não tem geo. */
    distancia_km?: number | null;
    es_demo?: boolean;
    cozinheiro_especialidade?: string;
    cozinheiro_nota?: number;
    cozinheiro_resposta_tempo?: string;
    cozinheiro_sobre?: string;
    retirada_endereco?: string;
    entrega_endereco_cliente?: string;
    tempo_preparo_label?: string;
  } | null;
};

export type HomePedidoItem = SolicitacaoClienteJson | (PedidoClienteAtivoJson & { tipo: 'pedido' });

/** `GET /api/solicitacoes/abertas` e `GET /api/solicitacoes/<id>` (cozinheiro).
 * View de descoberta — não contém PII sensível do cliente. */
export type SolicitacaoAbertaJson = {
  id: number;
  cliente_id: number;
  cliente_nome: string;
  situacao: 'aguardando_cozinheiro';
  data: string;
  hora: string;
  criado_em_iso: string | null;
  refeicoes_por_dia: number | null;
  calorias_diarias: number | null;
  restricoes: string | null;
  alimentos_proibidos: string | null;
  observacoes_nutricionista: string | null;
  qtd_dias: number | null;
  porcoes_por_refeicao: number | null;
  observacoes_adicionais: string | null;
  receita_link: string | null;
  ja_tem_proposta_minha: boolean;
  minha_proposta: {
    id: number;
    valor: number;
    status: number;
    data_criacao: string | null;
    tempo_entrega_min?: number | null;
  } | null;
  total_propostas: number;
  /**
   * Bucket categórico de distância cliente ↔ cozinheiro (PLAN §11). PII-safe:
   * nunca expõe km precisos — só ex.: `'<1 km'`, `'1–3 km'`, `'20+ km'`.
   * `null` quando pelo menos um lado não tem geo.
   */
  cliente_distancia_bucket?: string | null;
};

/** Filtros aceitos por `GET /api/solicitacoes/abertas`. */
export type SolicitacoesAbertasFiltros = {
  q?: string;
  minRefeicoes?: number;
  maxRefeicoes?: number;
  minCalorias?: number;
  maxCalorias?: number;
  /** Default: true no backend. */
  somenteSemPropostaMinha?: boolean;
  limit?: number;
  offset?: number;
};

/** Resposta do wrapper de criação de proposta. */
export type PropostaCriadaJson = {
  id: number;
  valor: number;
  status: number;
  solicitacao_id: number;
  data_criacao: string;
  receita_link: string | null;
};

/** `GET /api/cozinheiros` — marketplace (`web-prototype/cozinheiros.html`).
 *
 * Contrato real (confirmado via smoke test no backend em 2026-04-19):
 * `{ id, nome, avaliacao, especialidade, localizacao (=cep), rua,
 *   sobre, foto, telefone, tipo_entrega }`. Filtro suportado:
 * `?especialidade=<nome>`. Não há `q` server-side — busca textual é local.
 *
 * Mantemos campos legados (`nota`, `sobre_voce`, `bairro`, `cidade`,
 * `preco_medio`, `especialidades[]`) opcionais pra não quebrar se um dia
 * o schema evoluir.
 */
export type CozinheiroListJson = {
  id: number;
  nome: string;
  /** Especialidade principal (ex.: "Low carb"). */
  especialidade?: string | null;
  /** Especialidades adicionais, quando expostas pelo backend. */
  especialidades?: string[] | null;
  /** Média de avaliações vindas da tabela `pedidos` (0–5). */
  avaliacao?: number | null;
  /** CEP (ex.: "50710-350") — usado como label de localização. */
  localizacao?: string | null;
  /** Endereço livre (ex.: "Rua X, Bairro — Cidade/UF"). */
  rua?: string | null;
  /** Texto "sobre mim" do cozinheiro (bio). */
  sobre?: string | null;
  /** URL da foto (ou `null`). */
  foto?: string | null;
  /** Telefone em formato livre. */
  telefone?: string | null;
  /** `delivery` | `retirada` | `ambos`. */
  tipo_entrega?: 'delivery' | 'retirada' | 'ambos' | string | null;
  bairro?: string | null;
  cidade?: string | null;
  localidade?: string | null;
  uf?: string | null;
  nota?: number | null;
  total_avaliacoes?: number | null;
  preco_medio?: number | null;
  sobre_voce?: string | null;
  /** Distância precisa (km) cliente logado → cozinheiro (PLAN §10). `null` se geo ausente. */
  distancia_km?: number | null;
};

/** `GET /api/cozinheiros/<id>` — detalhes do cozinheiro (inclui marmitas). */
export type CozinheiroDetalhesJson = CozinheiroListJson & {
  marmitas?:
    | {
        id: number;
        nome: string;
        preco: number;
        foto: string | null;
      }[]
    | null;
};

/** `GET /api/cozinheiro/propostas` — inbox do cozinheiro (propostas próprias). */
export type CozinheiroPropostaListJson = {
  id: number;
  solicitacao_id: number;
  cliente_nome: string;
  valor: number;
  status: 0 | 1 | 2;
  status_texto: string;
  data_criacao: string;
  data_criacao_iso?: string | null;
  data_resposta_cliente?: string | null;
  /** Minutos prometidos pelo cozinheiro para moto-boy (só populado se ele oferece). */
  tempo_entrega_min?: number | null;
};

/** `GET /api/especialidades` — marketplace (chips). */
export type EspecialidadeJson = {
  id: number;
  nome: string;
};

/** `GET /api/pedidos/cozinheiro/<id>` — painel do cozinheiro. */
export type PedidoCozinheiroJson = {
  id: number;
  cliente_nome: string;
  cliente_id: number;
  status: string;
  data: string;
  qtd_marmitas: number;
  valor_total: number;
  avaliacao: number;
  proposta_id: number | null;
  proposta: {
    id: number;
    valor: number;
    status?: string;
    receita_link: string | null;
  } | null;
  endereco_entrega: string;
  /** Forma de entrega escolhida pelo cliente no aceite da proposta. */
  entrega_opcao?: EntregaOpcaoId | null;
  entrega_label?: string | null;
  taxa_entrega?: number | null;
  /** Tempo prometido pelo cozinheiro; só faz sentido se `entrega_opcao === 'motoboy'`. */
  tempo_entrega_min?: number | null;
};

export async function verificarLoginApi(): Promise<VerificarLoginJson | null> {
  try {
    const { res, rawText } = await getJsonRaw('/api/verificar-login');
    const { data } = parseJsonBody<VerificarLoginJson>(rawText, res.status);
    if (res.ok && data && typeof data === 'object' && 'logado' in data) {
      return data as VerificarLoginJson;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchPerfilClienteApi(): Promise<
  { ok: true; data: PerfilClienteJson } | { ok: false; error: string }
> {
  try {
    const { res, rawText } = await getJsonRaw('/api/perfil');
    const { data, parseNote } = parseJsonBody<PerfilClienteJson & { error?: string }>(rawText, res.status);
    if (res.ok && data && typeof data === 'object' && 'nome' in data && (data as PerfilClienteJson).tipo === 'cliente') {
      return { ok: true, data: data as PerfilClienteJson };
    }
    const err = data as { error?: string };
    return {
      ok: false,
      error: err.error || parseNote || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

/** `GET /api/perfil` (cozinheiro). */
export async function fetchPerfilCozinheiroApi(): Promise<
  { ok: true; data: PerfilCozinheiroJson } | { ok: false; error: string }
> {
  try {
    const { res, rawText } = await getJsonRaw('/api/perfil');
    const { data, parseNote } = parseJsonBody<PerfilCozinheiroJson & { error?: string }>(rawText, res.status);
    if (
      res.ok &&
      data &&
      typeof data === 'object' &&
      (data as PerfilCozinheiroJson).tipo === 'cozinheiro'
    ) {
      return { ok: true, data: data as PerfilCozinheiroJson };
    }
    const err = data as { error?: string };
    return {
      ok: false,
      error: err.error || parseNote || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

/** `PUT /api/perfil` — aceita subset; aqui usamos só os campos de entrega. */
export async function atualizarPerfilEntregaCozinheiroApi(payload: {
  taxa_motoboy?: number | null;
  aceita_parceiros?: boolean;
  taxa_parceiros?: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const body: Record<string, unknown> = {};
    if ('taxa_motoboy' in payload) body.taxa_motoboy = payload.taxa_motoboy;
    if ('aceita_parceiros' in payload) body.aceita_parceiros = payload.aceita_parceiros;
    if ('taxa_parceiros' in payload) body.taxa_parceiros = payload.taxa_parceiros;
    const { res, rawText } = await putJsonRaw('/api/perfil', body);
    const { data } = parseJsonBody<{ success?: boolean; error?: string }>(rawText, res.status);
    if (res.ok && data.success) return { ok: true };
    return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function fetchPedidosClienteTodosApi(
  clienteId: number,
): Promise<{ ok: true; pedidos: PedidoClienteHistoricoJson[] } | { ok: false; error: string }> {
  try {
    const { res, rawText } = await getJsonRaw(`/api/pedidos/cliente/${clienteId}`);
    if (res.ok) {
      try {
        const parsed = JSON.parse(rawText) as unknown;
        if (Array.isArray(parsed)) {
          return { ok: true, pedidos: parsed as PedidoClienteHistoricoJson[] };
        }
      } catch {
        /* fallthrough */
      }
      return { ok: false, error: 'Resposta inválida do servidor.' };
    }
    const { data } = parseJsonBody<{ error?: string }>(rawText, res.status);
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function fetchPedidosCozinheiroApi(
  cozinheiroId: number,
): Promise<{ ok: true; pedidos: PedidoCozinheiroJson[] } | { ok: false; error: string }> {
  try {
    const { res, rawText } = await getJsonRaw(`/api/pedidos/cozinheiro/${cozinheiroId}`);
    if (res.ok) {
      try {
        const parsed = JSON.parse(rawText) as unknown;
        if (Array.isArray(parsed)) {
          return { ok: true, pedidos: parsed as PedidoCozinheiroJson[] };
        }
      } catch {
        /* fallthrough */
      }
      return { ok: false, error: 'Resposta inválida do servidor.' };
    }
    const { data } = parseJsonBody<{ error?: string }>(rawText, res.status);
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function putPedidoStatusApi(
  pedidoId: number,
  status: string,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  try {
    const { res, rawText } = await putJsonRaw(`/api/pedidos/${pedidoId}/status`, { status });
    const { data, parseNote } = parseJsonBody<{
      success?: boolean;
      status?: string;
      error?: string;
    }>(rawText, res.status);
    if (res.ok && data && typeof data === 'object' && (data as { success?: boolean }).success === true) {
      return { ok: true, status: String((data as { status?: string }).status ?? status) };
    }
    return {
      ok: false,
      error:
        (typeof (data as { error?: string }).error === 'string' && (data as { error: string }).error) ||
        parseNote ||
        `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

/** `GET /api/cozinheiros` — lista pública de cozinheiros para o marketplace.
 *
 * Parse permissivo: aceita tanto `Array` quanto `{ cozinheiros: [...] }`.
 */
export async function fetchCozinheirosApi(filters?: {
  /** Nome exato da especialidade (ex.: "Low carb"). O backend filtra
   *  via `?especialidade=<nome>`. Não há `q` server-side; busca textual
   *  deve ser feita no cliente. */
  especialidade?: string;
}): Promise<{ ok: true; cozinheiros: CozinheiroListJson[] } | { ok: false; error: string }> {
  const params = new URLSearchParams();
  if (filters?.especialidade && filters.especialidade.trim()) {
    params.set('especialidade', filters.especialidade.trim());
  }
  const qs = params.toString();
  const path = qs ? `/api/cozinheiros?${qs}` : '/api/cozinheiros';
  try {
    const { res, rawText } = await getJsonRaw(path);
    if (res.ok) {
      try {
        const parsed = JSON.parse(rawText) as unknown;
        if (Array.isArray(parsed)) {
          return { ok: true, cozinheiros: parsed as CozinheiroListJson[] };
        }
        if (
          parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as { cozinheiros?: unknown }).cozinheiros)
        ) {
          return {
            ok: true,
            cozinheiros: (parsed as { cozinheiros: CozinheiroListJson[] }).cozinheiros,
          };
        }
      } catch {
        /* fallthrough */
      }
      return { ok: false, error: 'Resposta inválida do servidor.' };
    }
    const { data } = parseJsonBody<{ error?: string }>(rawText, res.status);
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

/** `GET /api/especialidades` — lista de especialidades para filtros do marketplace. */
export async function fetchEspecialidadesApi(): Promise<
  { ok: true; especialidades: EspecialidadeJson[] } | { ok: false; error: string }
> {
  try {
    const { res, rawText } = await getJsonRaw('/api/especialidades');
    if (res.ok) {
      try {
        const parsed = JSON.parse(rawText) as unknown;
        if (Array.isArray(parsed)) {
          return { ok: true, especialidades: parsed as EspecialidadeJson[] };
        }
        if (
          parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as { especialidades?: unknown }).especialidades)
        ) {
          return {
            ok: true,
            especialidades: (parsed as { especialidades: EspecialidadeJson[] }).especialidades,
          };
        }
      } catch {
        /* fallthrough */
      }
      return { ok: false, error: 'Resposta inválida do servidor.' };
    }
    const { data } = parseJsonBody<{ error?: string }>(rawText, res.status);
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

/** `GET /api/cozinheiros/<id>` — detalhes do cozinheiro para o modal do
 *  marketplace. Inclui `marmitas` quando o cozinheiro cadastrou alguma.
 */
export async function fetchCozinheiroDetalhesApi(
  id: number,
): Promise<
  { ok: true; cozinheiro: CozinheiroDetalhesJson } | { ok: false; error: string }
> {
  try {
    const { res, rawText } = await getJsonRaw(`/api/cozinheiros/${id}`);
    if (res.ok) {
      try {
        const parsed = JSON.parse(rawText) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ok: true, cozinheiro: parsed as CozinheiroDetalhesJson };
        }
      } catch {
        /* fallthrough */
      }
      return { ok: false, error: 'Resposta inválida do servidor.' };
    }
    const { data } = parseJsonBody<{ error?: string }>(rawText, res.status);
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function fetchCozinheiroPropostasApi(
  filtros: {
    status?: 'pendente' | 'aceita' | 'recusada' | 'todas' | '0' | '1' | '2';
    desde?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<
  | { ok: true; propostas: CozinheiroPropostaListJson[]; total: number }
  | { ok: false; error: string }
> {
  const params = new URLSearchParams();
  if (filtros.status != null && filtros.status !== 'todas') {
    params.set('status', String(filtros.status));
  }
  if (filtros.desde?.trim()) params.set('desde', filtros.desde.trim());
  if (filtros.limit != null) params.set('limit', String(filtros.limit));
  if (filtros.offset != null) params.set('offset', String(filtros.offset));
  const qs = params.toString();
  const path = qs ? `/api/cozinheiro/propostas?${qs}` : '/api/cozinheiro/propostas';
  try {
    const { res, rawText } = await getJsonRaw(path);
    if (res.ok) {
      try {
        const parsed = JSON.parse(rawText) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const obj = parsed as { propostas?: CozinheiroPropostaListJson[]; total?: number };
          if (Array.isArray(obj.propostas)) {
            const total = typeof obj.total === 'number' ? obj.total : obj.propostas.length;
            return { ok: true, propostas: obj.propostas, total };
          }
        }
        if (Array.isArray(parsed)) {
          const propostas = parsed as CozinheiroPropostaListJson[];
          return { ok: true, propostas, total: propostas.length };
        }
      } catch {
        /* fallthrough */
      }
      return { ok: false, error: 'Resposta inválida do servidor.' };
    }
    const { data } = parseJsonBody<{ error?: string }>(rawText, res.status);
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function fetchSolicitacoesAbertasApi(
  filtros?: SolicitacoesAbertasFiltros,
): Promise<
  | { ok: true; solicitacoes: SolicitacaoAbertaJson[]; total: number; limit: number; offset: number }
  | { ok: false; error: string }
> {
  const params = new URLSearchParams();
  if (filtros?.q && filtros.q.trim()) params.set('q', filtros.q.trim());
  if (filtros?.minRefeicoes != null) params.set('min_refeicoes', String(filtros.minRefeicoes));
  if (filtros?.maxRefeicoes != null) params.set('max_refeicoes', String(filtros.maxRefeicoes));
  if (filtros?.minCalorias != null) params.set('min_calorias', String(filtros.minCalorias));
  if (filtros?.maxCalorias != null) params.set('max_calorias', String(filtros.maxCalorias));
  if (filtros?.somenteSemPropostaMinha != null) {
    params.set('somente_sem_proposta_minha', filtros.somenteSemPropostaMinha ? 'true' : 'false');
  }
  if (filtros?.limit != null) params.set('limit', String(filtros.limit));
  if (filtros?.offset != null) params.set('offset', String(filtros.offset));

  const qs = params.toString();
  const path = qs ? `/api/solicitacoes/abertas?${qs}` : '/api/solicitacoes/abertas';

  try {
    const { res, rawText } = await getJsonRaw(path);
    const { data } = parseJsonBody<{
      solicitacoes?: SolicitacaoAbertaJson[];
      total?: number;
      limit?: number;
      offset?: number;
      error?: string;
    }>(rawText, res.status);
    if (res.ok && data && Array.isArray(data.solicitacoes)) {
      return {
        ok: true,
        solicitacoes: data.solicitacoes as SolicitacaoAbertaJson[],
        total: typeof data.total === 'number' ? data.total : data.solicitacoes.length,
        limit: typeof data.limit === 'number' ? data.limit : data.solicitacoes.length,
        offset: typeof data.offset === 'number' ? data.offset : 0,
      };
    }
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

/** `GET /api/solicitacoes/<id>` — retorna a view do cozinheiro quando logado
 *  como cozinheiro, ou a view do cliente (`SolicitacaoClienteJson`) quando o
 *  cliente dono está autenticado. Os dois schemas convivem no mesmo endpoint. */
export async function fetchSolicitacaoDetalheApi(
  solicitacaoId: number,
): Promise<
  | { ok: true; solicitacao: SolicitacaoAbertaJson | SolicitacaoClienteJson }
  | { ok: false; error: string }
> {
  try {
    const { res, rawText } = await getJsonRaw(`/api/solicitacoes/${solicitacaoId}`);
    const { data } = parseJsonBody<
      (SolicitacaoAbertaJson | SolicitacaoClienteJson) & { error?: string }
    >(rawText, res.status);
    if (res.ok && data && typeof data === 'object' && 'id' in (data as object)) {
      return {
        ok: true,
        solicitacao: data as SolicitacaoAbertaJson | SolicitacaoClienteJson,
      };
    }
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

/** `POST /api/propostas` — cozinheiro envia proposta para uma solicitação.
 *
 * `tempo_entrega_min` é obrigatório no backend quando o cozinheiro oferece
 * moto-boy (`Cozinheiro.taxa_motoboy != null`); aqui o tipo é opcional
 * porque o frontend só envia quando aplicável. Intervalo aceito: 5..240 min.
 */
export async function criarPropostaApi(payload: {
  solicitacao_id: number;
  valor: number;
  tempo_entrega_min?: number;
}): Promise<
  | { ok: true; proposta: PropostaCriadaJson }
  | { ok: false; error: string; duplicadaPropostaId?: number }
> {
  try {
    const body: Record<string, unknown> = {
      solicitacao_id: payload.solicitacao_id,
      valor: payload.valor,
    };
    if (typeof payload.tempo_entrega_min === 'number') {
      body.tempo_entrega_min = payload.tempo_entrega_min;
    }
    const { res, rawText } = await postJsonRaw('/api/propostas', body);
    const { data, parseNote } = parseJsonBody<{
      success?: boolean;
      proposta?: PropostaCriadaJson;
      error?: string;
      proposta_id?: number;
    }>(rawText, res.status);
    if (res.ok && data && data.success && data.proposta) {
      return { ok: true, proposta: data.proposta };
    }
    const err = (data as { error?: string }).error || parseNote || `HTTP ${res.status}`;
    const duplicadaPropostaId =
      res.status === 409 && typeof (data as { proposta_id?: number }).proposta_id === 'number'
        ? (data as { proposta_id: number }).proposta_id
        : undefined;
    return { ok: false, error: err, duplicadaPropostaId };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function fetchPedidosAtivosClienteApi(): Promise<
  { ok: true; pedidos: PedidoClienteAtivoJson[] } | { ok: false; error: string }
> {
  try {
    const { res, rawText } = await getJsonRaw('/api/pedidos/cliente/ativos');
    if (res.ok) {
      try {
        const parsed = JSON.parse(rawText) as unknown;
        if (Array.isArray(parsed)) {
          return { ok: true, pedidos: parsed as PedidoClienteAtivoJson[] };
        }
      } catch {
        /* fallthrough */
      }
      return { ok: false, error: 'Resposta inválida do servidor.' };
    }
    const { data } = parseJsonBody<{ error?: string }>(rawText, res.status);
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function fetchClienteHomePedidosApi(): Promise<
  | { ok: true; solicitacoes: SolicitacaoClienteJson[]; pedidos: PedidoClienteAtivoJson[] }
  | { ok: false; error: string }
> {
  try {
    const { res, rawText } = await getJsonRaw('/api/cliente/home-pedidos');
    const { data } = parseJsonBody<{
      solicitacoes?: SolicitacaoClienteJson[];
      pedidos?: PedidoClienteAtivoJson[];
      error?: string;
    }>(rawText, res.status);
    if (res.ok && data && Array.isArray(data.solicitacoes) && Array.isArray(data.pedidos)) {
      return {
        ok: true,
        solicitacoes: data.solicitacoes as SolicitacaoClienteJson[],
        pedidos: data.pedidos as PedidoClienteAtivoJson[],
      };
    }
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export type CriarSolicitacaoPayload = {
  modo: 'foto' | 'form';
  refeicoes_por_dia?: string;
  calorias_diarias?: string;
  restricoes?: string;
  alimentos_proibidos?: string;
  observacoes_nutricionista?: string;
  qtd_dias?: string;
  porcoes_por_refeicao?: string;
  observacoes_adicionais?: string;
  /** Local file from document picker (optional). */
  file?: { uri: string; name: string; mimeType?: string | null } | null;
};

export async function criarSolicitacaoApi(
  payload: CriarSolicitacaoPayload,
): Promise<{ ok: true; solicitacao_id: number } | { ok: false; error: string }> {
  const base = getApiBaseUrl();
  const path = '/api/solicitacoes';
  try {
    if (payload.file) {
      const fd = new FormData();
      fd.append('modo', payload.modo);
      fd.append('refeicoes_por_dia', payload.refeicoes_por_dia ?? '');
      fd.append('calorias_diarias', payload.calorias_diarias ?? '');
      fd.append('restricoes', payload.restricoes ?? '');
      fd.append('alimentos_proibidos', payload.alimentos_proibidos ?? '');
      fd.append('observacoes_nutricionista', payload.observacoes_nutricionista ?? '');
      fd.append('qtd_dias', payload.qtd_dias ?? '');
      fd.append('porcoes_por_refeicao', payload.porcoes_por_refeicao ?? '');
      fd.append('observacoes_adicionais', payload.observacoes_adicionais ?? '');
      fd.append('file', {
        uri: payload.file.uri,
        name: payload.file.name || 'receita',
        type: payload.file.mimeType || 'application/octet-stream',
      } as unknown as Blob);
      const headers = getApiHeaders();
      const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: fd, credentials: 'include' });
      const rawText = await res.text();
      const { data } = parseJsonBody<{ success?: boolean; solicitacao_id?: number; error?: string }>(rawText, res.status);
      if (res.ok && data.success && data.solicitacao_id != null) {
        return { ok: true, solicitacao_id: data.solicitacao_id };
      }
      return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
    }
    const body = {
      modo: payload.modo,
      refeicoes_por_dia: payload.refeicoes_por_dia || undefined,
      calorias_diarias: payload.calorias_diarias || undefined,
      restricoes: payload.restricoes || undefined,
      alimentos_proibidos: payload.alimentos_proibidos || undefined,
      observacoes_nutricionista: payload.observacoes_nutricionista || undefined,
      qtd_dias: payload.qtd_dias || undefined,
      porcoes_por_refeicao: payload.porcoes_por_refeicao || undefined,
      observacoes_adicionais: payload.observacoes_adicionais || undefined,
    };
    const { res, rawText } = await postJsonRaw(path, body);
    const { data } = parseJsonBody<{ success?: boolean; solicitacao_id?: number; error?: string }>(rawText, res.status);
    if (res.ok && data.success && data.solicitacao_id != null) {
      return { ok: true, solicitacao_id: data.solicitacao_id };
    }
    return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function responderPropostaClienteApi(
  propostaId: number,
  aceitar: boolean,
  opts?: { entregaOpcao?: EntregaOpcaoId },
): Promise<{ ok: true; pedidoId: number | null } | { ok: false; error: string }> {
  try {
    const body: Record<string, unknown> = { aceitar };
    if (opts?.entregaOpcao) {
      body.entregaOpcao = opts.entregaOpcao;
    }
    const { res, rawText } = await postJsonRaw(`/api/propostas/${propostaId}/responder-cliente`, body);
    const { data } = parseJsonBody<{ success?: boolean; error?: string; pedido_id?: number | null }>(
      rawText,
      res.status,
    );
    if (res.ok && data.success) {
      return { ok: true, pedidoId: typeof data.pedido_id === 'number' ? data.pedido_id : null };
    }
    return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function iniciarPagamentoApi(
  pedidoId: number,
  metodo: MetodoPagamento,
): Promise<{ ok: true; pagamento: PagamentoJson } | { ok: false; error: string }> {
  try {
    const { res, rawText } = await postJsonRaw(`/api/pedidos/${pedidoId}/pagamento/iniciar`, { metodo });
    const { data } = parseJsonBody<{ success?: boolean; error?: string; pagamento?: PagamentoJson }>(
      rawText,
      res.status,
    );
    if (res.ok && data.success && data.pagamento) {
      return { ok: true, pagamento: data.pagamento };
    }
    return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export type PagamentoCartaoInput = {
  numero: string;
  validade: string;
  cvv: string;
  titular: string;
};

export async function confirmarPagamentoApi(
  pedidoId: number,
  metodo: MetodoPagamento,
  cartao?: PagamentoCartaoInput,
): Promise<{ ok: true; pagamento: PagamentoJson } | { ok: false; error: string; field?: string }> {
  try {
    const body: Record<string, unknown> = { metodo };
    if (cartao) body.cartao = cartao;
    const { res, rawText } = await postJsonRaw(`/api/pedidos/${pedidoId}/pagamento/confirmar`, body);
    const { data } = parseJsonBody<{
      success?: boolean;
      error?: string;
      field?: string;
      pagamento?: PagamentoJson;
    }>(rawText, res.status);
    if (res.ok && data.success && data.pagamento) {
      return { ok: true, pagamento: data.pagamento };
    }
    return {
      ok: false,
      error: (data as { error?: string }).error || `HTTP ${res.status}`,
      field: (data as { field?: string }).field,
    };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function getPagamentoStatusApi(
  pedidoId: number,
): Promise<{ ok: true; pagamento: PagamentoJson } | { ok: false; error: string }> {
  try {
    const { res, rawText } = await getJsonRaw(`/api/pedidos/${pedidoId}/pagamento`);
    const { data } = parseJsonBody<{ success?: boolean; error?: string; pagamento?: PagamentoJson }>(
      rawText,
      res.status,
    );
    if (res.ok && data.success && data.pagamento) {
      return { ok: true, pagamento: data.pagamento };
    }
    return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

async function deleteJsonRaw(path: string): Promise<{ res: Response; rawText: string }> {
  const url = `${getApiBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getApiHeaders(),
    credentials: 'include',
  });
  const rawText = await res.text();
  return { res, rawText };
}

export async function deleteSolicitacaoApi(
  solicitacaoId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { res, rawText } = await deleteJsonRaw(`/api/solicitacoes/${solicitacaoId}`);
    const { data } = parseJsonBody<{ success?: boolean; error?: string }>(rawText, res.status);
    if (res.ok && data.success) {
      return { ok: true };
    }
    return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function deletePedidoClienteApi(
  pedidoId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { res, rawText } = await deleteJsonRaw(`/api/pedidos/${pedidoId}/cliente`);
    const { data } = parseJsonBody<{ success?: boolean; error?: string }>(rawText, res.status);
    if (res.ok && data.success) {
      return { ok: true };
    }
    return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

/**
 * Avalia um pedido entregue (`pode_avaliar` no histórico). Contrato esperado no Flask: **`POST /api/pedidos/<id>/avaliar`**
 * com JSON **`{ avaliacao: number }`** (nota 1–5). Se o backend usar outro path ou campo, alinhar **`lib/api.ts`** e **`IMPLEMENTATION_PLAN.md`**.
 */
export async function avaliarPedidoClienteApi(
  pedidoId: number,
  avaliacao: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nota = Math.round(avaliacao);
  if (nota < 1 || nota > 5) {
    return { ok: false, error: 'A nota deve ser entre 1 e 5.' };
  }
  try {
    const { res, rawText } = await postJsonRaw(`/api/pedidos/${pedidoId}/avaliar`, { avaliacao: nota });
    if (res.ok) {
      if (!rawText?.trim()) {
        return { ok: true };
      }
      const { data } = parseJsonBody<{ success?: boolean; error?: string }>(rawText, res.status);
      const d = data as { success?: boolean; error?: string } | null;
      if (d && d.success === false) {
        return { ok: false, error: d.error || `HTTP ${res.status}` };
      }
      return { ok: true };
    }
    const { data } = parseJsonBody<{ error?: string }>(rawText, res.status);
    return { ok: false, error: (data as { error?: string })?.error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function logoutApi(): Promise<boolean> {
  try {
    const { res } = await postJsonRaw('/api/logout', {});
    return res.ok;
  } catch {
    return false;
  }
}

async function postJsonRaw(path: string, body: unknown): Promise<{ res: Response; rawText: string }> {
  const url = `${getApiBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getApiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  return { res, rawText };
}

async function putJsonRaw(path: string, body: unknown): Promise<{ res: Response; rawText: string }> {
  const url = `${getApiBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getApiJsonHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  return { res, rawText };
}

function registerFailureMessage(
  res: Response,
  data: RegisterSuccessJson | RegisterErrorJson,
  parseNote: string | undefined,
): string {
  const err = data as RegisterErrorJson;
  const server = typeof err.error === 'string' && err.error.trim() ? err.error.trim() : '';
  if (server) return server;
  if (parseNote) return parseNote;
  return `Não foi possível concluir o cadastro (HTTP ${res.status}).`;
}

function loginFailureMessage(
  res: Response,
  data: LoginSuccessJson | RegisterErrorJson,
  parseNote: string | undefined,
): string {
  const err = data as RegisterErrorJson;
  const server = typeof err.error === 'string' && err.error.trim() ? err.error.trim() : '';
  if (server) return server;
  if (parseNote) return parseNote;
  return `Não foi possível entrar (HTTP ${res.status}).`;
}

export async function loginApi(payload: LoginPayload): Promise<LoginResult> {
  const path = '/api/login';
  const body = { email: payload.email.trim(), senha: payload.senha, tipo: payload.tipo };
  try {
    if (isDev) {
      console.log('[API login] POST', getApiBaseUrl() + path, { ...body, senha: '***' });
    }
    const { res, rawText } = await postJsonRaw(path, body);
    const { data, parseNote } = parseJsonBody<LoginSuccessJson | RegisterErrorJson>(rawText, res.status);
    if (isDev) {
      console.log('[API login] response', res.status, parseNote ?? 'json ok');
    }
    if (res.ok && data && typeof data === 'object' && 'success' in data && data.success === true) {
      return { ok: true, data: data as LoginSuccessJson };
    }
    return {
      ok: false,
      error: loginFailureMessage(res, data, parseNote),
      status: res.status,
    };
  } catch (e) {
    if (isDev) {
      console.warn('[API login] fetch error', e);
    }
    return {
      ok: false,
      error: getNetworkFailureMessage(e),
      status: 0,
    };
  }
}

export async function registerClienteApi(payload: RegisterClientePayload): Promise<RegisterResult> {
  const path = '/api/register/cliente';
  try {
    if (isDev) {
      console.log('[API register/cliente] POST', getApiBaseUrl() + path, redactRegisterPayload(payload as unknown as Record<string, unknown>));
    }
    const { res, rawText } = await postJsonRaw(path, payload);
    const { data, parseNote } = parseJsonBody<RegisterSuccessJson | RegisterErrorJson>(rawText, res.status);
    if (isDev) {
      console.log('[API register/cliente] response', res.status, parseNote ?? 'json ok', rawText.length > 500 ? `${rawText.slice(0, 500)}…` : rawText);
    }
    if (res.ok && data && typeof data === 'object' && 'success' in data && data.success === true) {
      return { ok: true, data: data as RegisterSuccessJson };
    }
    return {
      ok: false,
      error: registerFailureMessage(res, data, parseNote),
      error_code: (data as RegisterErrorJson).error_code,
      status: res.status,
    };
  } catch (e) {
    if (isDev) {
      console.warn('[API register/cliente] fetch error', e);
    }
    return {
      ok: false,
      error: getNetworkFailureMessage(e),
      status: 0,
    };
  }
}

export async function registerCozinheiroApi(payload: RegisterCozinheiroPayload): Promise<RegisterResult> {
  const path = '/api/register/cozinheiro';
  try {
    if (isDev) {
      console.log('[API register/cozinheiro] POST', getApiBaseUrl() + path, redactRegisterPayload(payload as unknown as Record<string, unknown>));
    }
    const { res, rawText } = await postJsonRaw(path, payload);
    const { data, parseNote } = parseJsonBody<RegisterSuccessJson | RegisterErrorJson>(rawText, res.status);
    if (isDev) {
      console.log('[API register/cozinheiro] response', res.status, parseNote ?? 'json ok', rawText.length > 500 ? `${rawText.slice(0, 500)}…` : rawText);
    }
    if (res.ok && data && typeof data === 'object' && 'success' in data && data.success === true) {
      return { ok: true, data: data as RegisterSuccessJson };
    }
    return {
      ok: false,
      error: registerFailureMessage(res, data, parseNote),
      error_code: (data as RegisterErrorJson).error_code,
      status: res.status,
    };
  } catch (e) {
    if (isDev) {
      console.warn('[API register/cozinheiro] fetch error', e);
    }
    return {
      ok: false,
      error: getNetworkFailureMessage(e),
      status: 0,
    };
  }
}

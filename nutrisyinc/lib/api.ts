<<<<<<< Updated upstream
import { mockCooks } from '@/data/mocks/cooks';
import { mockPedidos } from '@/data/mocks/pedidos';
import type { Cook, Pedido } from '@/types/models';

/**
 * API-shaped helpers returning mock data for now.
 * Swap implementations for real `fetch` + auth headers when the backend is ready.
 */

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function fetchCooks(): Promise<Cook[]> {
  return delay(80, [...mockCooks]);
}

export async function fetchPedidos(): Promise<Pedido[]> {
  return delay(80, [...mockPedidos]);
=======
/**
 * HTTP API for the Flask backend (`backend/src/app.py`).
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
    cozinheiro_nome: string;
    tipo_entrega: string;
    /** Preço base antes da taxa de entrega */
    base_valor?: number;
    opciones_entrega?: { id: string; label: string; taxa: number; estimativa?: boolean }[];
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

export type DemoPropostaJson = {
  success: boolean;
  ja_existia?: boolean;
  cozinheiro_nome?: string;
  valor?: number;
  base_valor?: number;
  tipo_entrega?: string;
  opciones_entrega?: { id: string; label: string; taxa: number; estimativa?: boolean }[];
  es_demo?: boolean;
  proposta_id?: number;
  tempo_preparo_label?: string;
  cozinheiro_especialidade?: string;
  cozinheiro_nota?: number;
  cozinheiro_resposta_tempo?: string;
  cozinheiro_sobre?: string;
  retirada_endereco?: string;
  entrega_endereco_cliente?: string;
  error?: string;
  /** Machine-readable reason when HTTP 4xx (e.g. NO_COZINHEIRO, SOLICITACAO_CONVERTIDA). */
  error_code?: string;
};

export async function gerarDemoPropostaApi(
  solicitacaoId: number,
): Promise<{ ok: true; data: DemoPropostaJson } | { ok: false; error: string }> {
  try {
    const { res, rawText } = await postJsonRaw(`/api/solicitacoes/${solicitacaoId}/demo-proposta`, {});
    const { data } = parseJsonBody<DemoPropostaJson>(rawText, res.status);
    if (res.ok && data.success) {
      return { ok: true, data };
    }
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: getNetworkFailureMessage(e) };
  }
}

export async function responderPropostaClienteApi(
  propostaId: number,
  aceitar: boolean,
  opts?: { demoEntregaOpcao?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const body: Record<string, unknown> = { aceitar };
    if (opts?.demoEntregaOpcao) {
      body.demo_entrega_opcao = opts.demoEntregaOpcao;
    }
    const { res, rawText } = await postJsonRaw(`/api/propostas/${propostaId}/responder-cliente`, body);
    const { data } = parseJsonBody<{ success?: boolean; error?: string }>(rawText, res.status);
    if (res.ok && data.success) {
      return { ok: true };
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
>>>>>>> Stashed changes
}

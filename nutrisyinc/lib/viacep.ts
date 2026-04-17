export type ViaCepResponse = {
<<<<<<< Updated upstream
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export async function fetchViaCep(
  cepDigits: string,
  signal?: AbortSignal
): Promise<{ ok: true; data: ViaCepResponse } | { ok: false }> {
  if (cepDigits.length !== 8) return { ok: false };
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, { signal });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as ViaCepResponse;
    if (data.erro === true) return { ok: false };
    return { ok: true, data };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    return { ok: false };
  }
=======
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

/**
 * Fetch address by CEP (8 digits, no mask).
 * @see https://viacep.com.br/
 */
export async function fetchViaCep(cepDigits: string): Promise<ViaCepResponse> {
  const clean = cepDigits.replace(/\D/g, '');
  if (clean.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos.');
  }
  const url = `https://viacep.com.br/ws/${clean}/json/`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Não foi possível consultar o CEP.');
  }
  const data = (await res.json()) as ViaCepResponse;
  if (data.erro) {
    throw new Error('CEP não encontrado.');
  }
  return data;
>>>>>>> Stashed changes
}

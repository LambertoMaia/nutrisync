export type ViaCepResponse = {
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
}

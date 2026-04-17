export type ViaCepResponse = {
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
}

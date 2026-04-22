/** Keep only digits, max length. */
export function digitsOnly(text: string, maxLen: number): string {
  return text.replace(/\D/g, '').slice(0, maxLen);
}

/** Brazilian phone: (99) 99999-9999 or (99) 9999-9999 — up to 11 digits. */
export function maskPhoneBR(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** CEP: 99999-999 */
export function maskCep(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** BRL: centavos → "R$ 1.234,56" (máx 9 dígitos → R$ 9.999.999,99). */
export function maskBrlFromDigits(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 9).padStart(3, '0');
  const reais = d.slice(0, -2).replace(/^0+(?=\d)/, '');
  const cents = d.slice(-2);
  const milhares = (reais || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${milhares},${cents}`;
}

/** Converte a máscara BRL de volta para Number (em reais, com 2 casas). */
export function brlToNumber(masked: string): number {
  const digits = masked.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

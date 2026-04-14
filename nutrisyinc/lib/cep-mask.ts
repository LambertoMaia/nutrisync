/** Digits only. */
export function stripCepDigits(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Brazilian CEP: 99999-999 — max 8 digits, non-digits stripped.
 */
export function formatBrazilCepMask(input: string): string {
  const d = stripCepDigits(input).slice(0, 8);
  if (d.length === 0) return '';
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

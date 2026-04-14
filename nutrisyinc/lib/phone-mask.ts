/** Digits only (no max). */
export function stripPhoneDigits(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Brazilian mobile: (99) 99999-9999 — digits only in input, max 11.
 * Non-digits are stripped; output is always this mask shape when possible.
 */
export function formatBrazilPhoneMask(input: string): string {
  const d = stripPhoneDigits(input).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** First word of a full name (for greetings). */
export function firstName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return '';
  return t.split(/\s+/)[0] ?? t;
}

/** Single uppercase letter for avatar (first name). */
export function initialFromName(fullName: string): string {
  const f = firstName(fullName);
  if (!f) return '?';
  const ch = f[0];
  return ch ? ch.toUpperCase() : '?';
}

import { stripPhoneDigits } from '@/lib/phone-mask';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

export type LoginValidation = { email: string; password: string };

export function validateLogin(input: LoginValidation): string | null {
  if (!isNonEmpty(input.email)) return 'Informe o e-mail.';
  if (!isValidEmail(input.email)) return 'E-mail inválido.';
  if (!isNonEmpty(input.password)) return 'Informe a senha.';
  if (!minLength(input.password, 6)) return 'Senha deve ter pelo menos 6 caracteres.';
  return null;
}

export type RegisterCommon = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export function validateRegisterCommon(c: RegisterCommon): string | null {
  if (!isNonEmpty(c.name)) return 'Informe o nome completo.';
  if (!isNonEmpty(c.email)) return 'Informe o e-mail.';
  if (!isValidEmail(c.email)) return 'E-mail inválido.';
  if (!isNonEmpty(c.phone)) return 'Informe o telefone.';
  if (stripPhoneDigits(c.phone).length !== 11) {
    return 'Telefone: use (99) 99999-9999 com 11 dígitos (DDD + celular).';
  }
  if (!isNonEmpty(c.password)) return 'Informe a senha.';
  if (!minLength(c.password, 8)) return 'Senha: mínimo 8 caracteres.';
  if (c.password !== c.confirmPassword) return 'As senhas não coincidem.';
  return null;
}

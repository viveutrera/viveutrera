import type { Language, LanguageCode } from '../domain/types';

export const defaultLanguageCode: LanguageCode = 'es';

export function isLanguageCode(value: string | undefined): value is LanguageCode {
  return value === 'es' || value === 'en' || value === 'fr' || value === 'de';
}

export function resolveLanguage(value: string | undefined, languages: Language[]): LanguageCode {
  if (isLanguageCode(value) && languages.some((language) => language.code === value && language.isActive)) return value;
  const configuredDefault = languages.find((language) => language.isDefault && language.isActive)?.code;
  return configuredDefault ?? defaultLanguageCode;
}

export function persistLanguage(language: LanguageCode) {
  localStorage.setItem('vive-utrera-language', language);
}

export function getPersistedLanguage(): LanguageCode | undefined {
  const value = localStorage.getItem('vive-utrera-language');
  return isLanguageCode(value ?? undefined) ? value as LanguageCode : undefined;
}

export function languageName(code: LanguageCode, languages: Language[]) {
  return languages.find((language) => language.code === code)?.nativeName ?? code.toUpperCase();
}

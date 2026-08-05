export function validateRequired(value: string | undefined | null, label: string) {
  return value?.trim() ? '' : `${label} es obligatorio.`;
}

export function validateSlug(value: string) {
  const slug = value.trim();
  if (!slug) return 'El slug es obligatorio.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'El slug solo puede usar minusculas, numeros y guiones entre palabras.';
  }
  return '';
}

export function validateOptionalUrl(value: string, label = 'La URL') {
  const candidate = value.trim();
  if (!candidate) return '';

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? '' : `${label} debe empezar por http:// o https://.`;
  } catch {
    return `${label} no tiene un formato valido.`;
  }
}

export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function slugify(value: string, fallback = 'item') {
  const slug = normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

export function matchesSearch(values: Array<string | null | undefined>, query: string) {
  const needle = normalizeText(query.trim());
  if (!needle) return true;
  return values.some((value) => normalizeText(value ?? '').includes(needle));
}

interface SeoInput {
  title: string;
  description: string;
  path: string;
  language: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown>;
}

function siteUrl() {
  return (import.meta.env.VITE_SITE_URL || 'https://viveutrera.github.io/viveutrera').replace(/\/$/, '');
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    if (hreflang) element.hreflang = hreflang;
    document.head.appendChild(element);
  }
  element.href = href;
}

export function setSeo({ title, description, path, language, type = 'website', jsonLd }: SeoInput) {
  const canonical = `${siteUrl()}${path}`;
  document.title = title;
  document.documentElement.lang = language;

  upsertMeta('meta[name="description"]', { name: 'description', content: description });
  upsertLink('canonical', canonical);
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Vive Utrera' });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });

  document.head.querySelector('#vive-utrera-jsonld')?.remove();
  if (jsonLd) {
    const script = document.createElement('script');
    script.id = 'vive-utrera-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }
}

export function setAlternateLanguages(pathFactory: (code: string) => string, languages: string[]) {
  languages.forEach((language) => {
    upsertLink('alternate', `${siteUrl()}${pathFactory(language)}`, language);
  });
}

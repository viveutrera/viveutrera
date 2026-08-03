import type { LanguageCode } from '../domain/types';

export const uiText: Record<LanguageCode, Record<string, string>> = {
  es: {
    guide: 'Ver guia',
    all: 'Todos',
    search: 'Buscar lugares',
    noResults: 'No hay resultados con esos filtros.',
    location: 'Ubicacion',
    moreInfo: '+ info',
    links: 'Enlaces',
    audios: 'Audioguias',
    back: 'Volver',
    admin: 'Administracion',
    login: 'Entrar',
    email: 'Correo',
    password: 'Contrasena'
  },
  en: {
    guide: 'View guide',
    all: 'All',
    search: 'Search places',
    noResults: 'No results for those filters.',
    location: 'Location',
    moreInfo: '+ info',
    links: 'Links',
    audios: 'Audio guides',
    back: 'Back',
    admin: 'Administration',
    login: 'Sign in',
    email: 'Email',
    password: 'Password'
  },
  fr: {
    guide: 'Voir le guide',
    all: 'Tous',
    search: 'Rechercher',
    noResults: 'Aucun resultat.',
    location: 'Emplacement',
    moreInfo: '+ info',
    links: 'Liens',
    audios: 'Audioguides',
    back: 'Retour',
    admin: 'Administration',
    login: 'Connexion',
    email: 'E-mail',
    password: 'Mot de passe'
  },
  de: {
    guide: 'Guide ansehen',
    all: 'Alle',
    search: 'Orte suchen',
    noResults: 'Keine Ergebnisse.',
    location: 'Standort',
    moreInfo: '+ info',
    links: 'Links',
    audios: 'Audioguides',
    back: 'Zuruck',
    admin: 'Administration',
    login: 'Anmelden',
    email: 'E-Mail',
    password: 'Passwort'
  }
};

export function t(language: LanguageCode, key: string) {
  return uiText[language]?.[key] ?? uiText.es[key] ?? key;
}

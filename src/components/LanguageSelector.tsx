import { Link } from 'react-router-dom';
import type { Language, LanguageCode } from '../domain/types';
import { publicPath } from '../lib/routing';

interface LanguageSelectorProps {
  current: LanguageCode;
  languages: Language[];
  pathFor: (code: LanguageCode) => string;
}

export function LanguageSelector({ current, languages, pathFor }: LanguageSelectorProps) {
  return (
    <nav className="language-selector" aria-label="Seleccion de idioma">
      {languages.map((language) => (
        <Link
          key={language.id}
          className={language.code === current ? 'active' : ''}
          to={pathFor(language.code)}
          aria-label={language.nativeName}
          aria-current={language.code === current ? 'page' : undefined}
        >
          <img src={publicPath(`flags/flag-${language.code}.png`)} alt="" />
        </Link>
      ))}
    </nav>
  );
}

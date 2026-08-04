import { Languages } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Language, LanguageCode } from '../domain/types';

interface LanguageSelectorProps {
  current: LanguageCode;
  languages: Language[];
  pathFor: (code: LanguageCode) => string;
}

export function LanguageSelector({ current, languages, pathFor }: LanguageSelectorProps) {
  return (
    <nav className="language-selector" aria-label="Seleccion de idioma">
      <Languages size={18} aria-hidden="true" />
      {languages.map((language) => (
        <Link
          key={language.id}
          className={language.code === current ? 'active' : ''}
          to={pathFor(language.code)}
          aria-current={language.code === current ? 'page' : undefined}
        >
          {language.code.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}

import { Globe2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Language, LanguageCode } from '../domain/types';
import { publicPath } from '../lib/routing';

interface LanguageSelectorProps {
  current: LanguageCode;
  languages: Language[];
  pathFor: (code: LanguageCode) => string;
}

export function LanguageSelector({ current, languages, pathFor }: LanguageSelectorProps) {
  const [isOpen, setOpen] = useState(false);

  return (
    <div className="language-selector-menu">
      <button
        className="language-selector-toggle"
        type="button"
        aria-label="Cambiar idioma"
        aria-expanded={isOpen}
        onClick={() => setOpen((value) => !value)}
      >
        <Globe2 size={22} />
      </button>
      <nav className={isOpen ? 'language-selector open' : 'language-selector'} aria-label="Seleccion de idioma">
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
    </div>
  );
}

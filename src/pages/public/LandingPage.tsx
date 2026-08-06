import { ArrowRight, CalendarDays, ExternalLink, Globe2, Headphones, Landmark } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicFooter } from '../../components/PublicFooter';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { Collaborator, Language, LanguageCode, SiteContent } from '../../domain/types';
import { defaultLanguageCode, getPersistedLanguage, persistLanguage } from '../../lib/language';
import { mediaUrl } from '../../lib/media';
import { publicPath } from '../../lib/routing';
import { setSeo } from '../../lib/seo';

export function LandingPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [content, setContent] = useState<SiteContent>();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [landingLanguage, setLandingLanguage] = useState<LanguageCode>(getPersistedLanguage() ?? defaultLanguageCode);
  const [isLanguageMenuOpen, setLanguageMenuOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      guideRepository.getLanguages(),
      guideRepository.getCollaborators()
    ]).then(([languageData, collaboratorData]) => {
      setLanguages(languageData);
      setCollaborators(collaboratorData);
    });
  }, []);

  useEffect(() => {
    guideRepository.getSiteContent(landingLanguage).then((siteData) => {
      setContent(siteData);
      setSeo({
        title: siteData.seoTitle,
        description: siteData.seoDescription,
        path: '/',
        language: landingLanguage,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'TouristInformationCenter',
          name: 'Vive Utrera',
          description: siteData.seoDescription,
          url: import.meta.env.VITE_SITE_URL || 'https://viveutrera.github.io/viveutrera'
        }
      });
    });
  }, [landingLanguage]);

  function changeLandingLanguage(language: LanguageCode) {
    setLandingLanguage(language);
    persistLanguage(language);
    setLanguageMenuOpen(false);
  }

  if (!content) return <LoadingState label="Preparando Vive Utrera" />;

  return (
    <>
      <header
        className={`hero ${content.heroImageObjectKey ? 'hero-with-media' : ''}`}
        style={content.heroImageObjectKey ? { '--hero-image': `url(${mediaUrl(content.heroImageObjectKey)})` } as CSSProperties : undefined}
      >
        <nav className="hero-nav" aria-label="Principal">
          <button
            className="landing-language-menu-button"
            type="button"
            aria-label="Cambiar idioma"
            aria-expanded={isLanguageMenuOpen}
            onClick={() => setLanguageMenuOpen((value) => !value)}
          >
            <Globe2 size={22} />
          </button>
          <div className={isLanguageMenuOpen ? 'landing-language-switcher open' : 'landing-language-switcher'} aria-label="Cambiar idioma de la pagina principal">
            {languages.map((language) => (
              <button
                key={language.id}
                type="button"
                className={language.code === landingLanguage ? 'active' : ''}
                onClick={() => changeLandingLanguage(language.code)}
                aria-label={language.nativeName}
                aria-pressed={language.code === landingLanguage}
              >
                <img src={publicPath(flagPath(language.code, false))} alt="" />
              </button>
            ))}
          </div>
        </nav>
        <div className="hero-content hero-brand-lockup">
          <img className="hero-mark" src={content.heroLogoObjectKey ? mediaUrl(content.heroLogoObjectKey) : publicPath('brand/logo-vive-utrera.png')} alt="" aria-hidden="true" />
          <div className="hero-wordmark">
            <h1 className="sr-only">{content.heroTitle}</h1>
            <p className="hero-wordmark-title" aria-hidden="true">
              <span>VIVE</span>
              <span>UTRERA</span>
            </p>
            <p className="hero-slogan">{content.heroSlogan}</p>
            <p className="hero-description">{content.heroDescription}</p>
          </div>
        </div>
      </header>

      <main>
        <section className="section landing-language-section">
          <div className="language-grid">
            {languages.map((language) => (
              <Card key={language.id} className="language-card">
                <Link className="flag-link" to={`/guia/${language.code}`} onClick={() => persistLanguage(language.code)} aria-label={`Abrir guia en ${language.nativeName}`}>
                  <img className="flag" src={publicPath(flagPath(language.code, true))} alt={language.nativeName} />
                </Link>
                <p>{language.code === 'es' ? language.cardText.replace('espanol', 'español') : language.cardText}</p>
                <ButtonLink to={`/guia/${language.code}`} variant="primary" onClick={() => persistLanguage(language.code)}>
                  {language.cardButton} <ArrowRight size={16} />
                </ButtonLink>
              </Card>
            ))}
          </div>
        </section>

        <section className="section feature-section" aria-label="Funciones principales">
          <div className="feature-strip">
            <article>
              <span className="feature-icon"><Headphones size={34} /></span>
              <div>
                <h2>AUDIOGUÍAS</h2>
                <p>Recorridos con relatos sonoros para escuchar a tu ritmo.</p>
              </div>
            </article>
            <article>
              <span className="feature-icon"><Landmark size={34} /></span>
              <div>
                <h2>HISTORIA</h2>
                <p>Un viaje riguroso por los siglos de huella cultural.</p>
              </div>
            </article>
            <article>
              <span className="feature-icon"><CalendarDays size={34} /></span>
              <div>
                <h2>FIESTAS Y TRADICIONES</h2>
                <p>Mantente al día con nuestras tradiciones más arraigadas.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="section section-stone">
          <div className="section-heading">
            <h2>Colaboradores</h2>
            <p>Logotipos y agradecimientos configurables desde administracion.</p>
          </div>
          <div className="collaborator-grid">
            {collaborators.map((collaborator) => (
              <a key={collaborator.id} className="collaborator" href={collaborator.url ?? '#'} aria-label={collaborator.name}>
                {collaborator.mediaAsset ? <img src={mediaUrl(collaborator.mediaAsset.objectKey)} alt={collaborator.translations.es.displayName} loading="lazy" /> : null}
                <span>{collaborator.translations.es.displayName}</span>
                {collaborator.url ? <ExternalLink size={14} /> : null}
              </a>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}

function flagPath(language: LanguageCode, round: boolean) {
  return `flags/flag-${language}${round ? '-round' : ''}.png`;
}

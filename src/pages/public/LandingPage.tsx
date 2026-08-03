import { ArrowRight, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { Collaborator, Language, SiteContent } from '../../domain/types';
import { mediaUrl } from '../../lib/media';

export function LandingPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [content, setContent] = useState<SiteContent>();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    Promise.all([
      guideRepository.getLanguages(),
      guideRepository.getSiteContent('es'),
      guideRepository.getCollaborators()
    ]).then(([languageData, siteData, collaboratorData]) => {
      setLanguages(languageData);
      setContent(siteData);
      setCollaborators(collaboratorData);
      document.documentElement.lang = 'es';
      document.title = siteData.seoTitle;
    });
  }, []);

  if (!content) return <LoadingState label="Preparando Vive Utrera" />;

  return (
    <>
      <header className="hero">
        <nav className="hero-nav" aria-label="Principal">
          <img src={`${import.meta.env.BASE_URL}brand/logo-horizontal-placeholder.svg`} alt="Vive Utrera" />
          <ButtonLink to="/admin/login" variant="secondary">Admin</ButtonLink>
        </nav>
        <div className="hero-content">
          <p className="brand-kicker">Vive Utrera</p>
          <h1>{content.heroTitle}</h1>
          <p className="hero-slogan">{content.heroSlogan}</p>
          <p className="hero-description">{content.heroDescription}</p>
        </div>
      </header>

      <main>
        <section className="section">
          <div className="section-heading">
            <h2>Elige idioma</h2>
            <p>{content.cityText}</p>
          </div>
          <div className="language-grid">
            {languages.map((language) => (
              <Card key={language.id} className="language-card">
                <span className="flag" aria-hidden="true">{language.flagCode}</span>
                <h3>{language.nativeName}</h3>
                <p>{language.cardText}</p>
                <ButtonLink to={`/guia/${language.code}`} variant="primary">
                  {language.cardButton} <ArrowRight size={16} />
                </ButtonLink>
              </Card>
            ))}
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
                <img src={mediaUrl(collaborator.mediaAsset.objectKey)} alt={collaborator.translations.es.displayName} loading="lazy" />
                <span>{collaborator.translations.es.displayName}</span>
                {collaborator.url ? <ExternalLink size={14} /> : null}
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

import { ExternalLink, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicFooter } from '../../components/PublicFooter';
import { PublicTopNav } from '../../components/PublicTopNav';
import { LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { Collaborator, CollaboratorsPageContent, Language, LanguageCode } from '../../domain/types';
import { defaultLanguageCode, getPersistedLanguage, persistLanguage } from '../../lib/language';
import { mediaUrl } from '../../lib/media';
import { publicPath } from '../../lib/routing';
import { setSeo } from '../../lib/seo';

export function CollaboratorsPage() {
  const [language, setLanguage] = useState<LanguageCode>(getPersistedLanguage() ?? defaultLanguageCode);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [content, setContent] = useState<CollaboratorsPageContent>();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    Promise.all([
      guideRepository.getCollaboratorsPageContent(),
      guideRepository.getCollaborators(),
      guideRepository.getLanguages()
    ]).then(([pageContent, collaboratorRows, languageRows]) => {
      setContent(pageContent);
      setCollaborators(collaboratorRows);
      setLanguages(languageRows);
      setSeo({
        title: `${pageContent.title} Vive Utrera`,
        description: pageContent.subtitle,
        path: '/colaboradores',
        language
      });
    });
  }, [language]);

  function changeLanguage(code: LanguageCode) {
    setLanguage(code);
    persistLanguage(code);
  }

  if (!content) return <LoadingState label="Cargando colaboradores" />;

  const special = collaborators.filter((collaborator) => collaborator.isSpecial);
  const general = collaborators.filter((collaborator) => !collaborator.isSpecial);

  return (
    <>
      <PublicTopNav current={language} languages={languages} onLanguageSelect={changeLanguage} />
      <main className="project-page project-page-collaborators">
        <header className="project-hero">
          <img className="project-logo" src={publicPath('brand/logo-vive-utrera.png')} alt="" aria-hidden="true" />
          <p className="project-wordmark"><span>VIVE</span><strong>UTRERA</strong></p>
          <h1>{content.title}</h1>
          <p>{content.subtitle}</p>
        </header>

        <section className="project-section">
          <div className="general-supporter-grid">
            {general.length ? general.map((collaborator) => (
              <GeneralSupporter key={collaborator.id} collaborator={collaborator} language={language} />
            )) : <p className="hint">{content.generalSectionEmptyText}</p>}
          </div>
        </section>

        <section className="project-section">
          <div className="special-supporter-list">
            {special.length ? special.map((collaborator) => (
              <SpecialSupporter key={collaborator.id} collaborator={collaborator} language={language} />
            )) : <p className="hint">{content.specialSectionEmptyText}</p>}
          </div>
        </section>

        <section className="supporter-callout">
          <div>
            <h2>{content.calloutTitle}</h2>
            <p>{content.calloutText}</p>
          </div>
          <Link className="button button-primary" to="/donativos"><span>{content.calloutButtonLabel}</span></Link>
        </section>

        <p className="project-closing">{content.closingText}</p>
      </main>
      <PublicFooter />
    </>
  );
}

function SpecialSupporter({ collaborator, language }: { collaborator: Collaborator; language: LanguageCode }) {
  const translation = collaborator.translations[language] ?? collaborator.translations.es;
  const content = (
    <>
      <SupporterImage collaborator={collaborator} name={translation.displayName} />
      <div>
        {collaborator.showName ? <h3>{translation.displayName}</h3> : null}
        {translation.thankYouText ? <p>{translation.thankYouText}</p> : null}
      </div>
    </>
  );

  return (
    <article className="special-supporter-card">
      {content}
      {collaborator.url ? (
        <a className="supporter-external" href={collaborator.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${translation.displayName}`}>
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      ) : null}
    </article>
  );
}

function GeneralSupporter({ collaborator, language }: { collaborator: Collaborator; language: LanguageCode }) {
  const translation = collaborator.translations[language] ?? collaborator.translations.es;
  const content = (
    <>
      <SupporterImage collaborator={collaborator} name={translation.displayName} />
      {collaborator.showName ? <h3>{translation.displayName}</h3> : null}
    </>
  );

  return collaborator.url ? (
    <a className="general-supporter-card" href={collaborator.url} target="_blank" rel="noreferrer" aria-label={translation.displayName}>
      {content}
    </a>
  ) : <article className="general-supporter-card">{content}</article>;
}

function SupporterImage({ collaborator, name }: { collaborator: Collaborator; name: string }) {
  return collaborator.mediaAsset
    ? <img src={mediaUrl(collaborator.mediaAsset.objectKey)} alt={name} loading="lazy" />
    : <span className="supporter-placeholder"><Users size={34} /></span>;
}

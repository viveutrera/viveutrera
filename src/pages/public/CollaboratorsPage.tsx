import { ExternalLink, Heart, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicFooter } from '../../components/PublicFooter';
import { LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { Collaborator, LanguageCode, SiteContent } from '../../domain/types';
import { defaultLanguageCode, getPersistedLanguage } from '../../lib/language';
import { mediaUrl } from '../../lib/media';
import { publicPath } from '../../lib/routing';
import { setSeo } from '../../lib/seo';

export function CollaboratorsPage() {
  const language = getPersistedLanguage() ?? defaultLanguageCode;
  const [content, setContent] = useState<SiteContent>();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    Promise.all([
      guideRepository.getSiteContent(language),
      guideRepository.getCollaborators()
    ]).then(([siteContent, collaboratorRows]) => {
      setContent(siteContent);
      setCollaborators(collaboratorRows);
      setSeo({
        title: 'Colaboradores Vive Utrera',
        description: 'Entidades, empresas y personas que apoyan el proyecto cultural Vive Utrera.',
        path: '/colaboradores',
        language
      });
    });
  }, [language]);

  if (!content) return <LoadingState label="Cargando colaboradores" />;

  const special = collaborators.filter((collaborator) => collaborator.isSpecial);
  const general = collaborators.filter((collaborator) => !collaborator.isSpecial);

  return (
    <>
      <main className="project-page project-page-collaborators">
        <header className="project-hero">
          <img className="project-logo" src={publicPath('brand/logo-vive-utrera.png')} alt="" aria-hidden="true" />
          <p className="project-wordmark"><span>VIVE</span><strong>UTRERA</strong></p>
          <h1>Colaboradores</h1>
          <p>Entidades, empresas y personas que apoyan este proyecto cultural.</p>
        </header>

        <section className="project-section">
          <div className="special-supporter-list">
            {special.length ? special.map((collaborator) => (
              <SpecialSupporter key={collaborator.id} collaborator={collaborator} language={language} />
            )) : <p className="hint">Los colaboradores especiales apareceran cuando esten configurados.</p>}
          </div>
        </section>

        <section className="project-section">
          <div className="general-supporter-grid">
            {general.length ? general.map((collaborator) => (
              <GeneralSupporter key={collaborator.id} collaborator={collaborator} language={language} />
            )) : <p className="hint">Los colaboradores generales apareceran cuando esten configurados.</p>}
          </div>
        </section>

        <section className="supporter-callout">
          <span><Heart size={38} /></span>
          <div>
            <h2>¿Eres una entidad o empresa de Utrera?</h2>
            <p>Unete a Vive Utrera y forma parte de este proyecto cultural que pone en valor nuestra ciudad.</p>
          </div>
          <Link className="button button-primary" to="/donativos"><span>Quiero colaborar</span></Link>
        </section>

        <p className="project-closing">Gracias por apoyar la cultura local</p>
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

  return collaborator.url ? (
    <a className="special-supporter-card" href={collaborator.url} target="_blank" rel="noreferrer">
      {content}
      <ExternalLink className="supporter-external" size={16} />
    </a>
  ) : <article className="special-supporter-card">{content}</article>;
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

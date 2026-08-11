import { ArrowRight, CalendarDays, ExternalLink, Globe2, Headphones, Landmark, Users } from 'lucide-react';
import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicFooter } from '../../components/PublicFooter';
import { PublicUserMenu } from '../../components/PublicUserMenu';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import { tourRepository } from '../../data/supabaseRepository';
import type { Collaborator, Language, LanguageCode, SiteContent } from '../../domain/types';
import { t } from '../../i18n/ui';
import { defaultLanguageCode, getPersistedLanguage, persistLanguage } from '../../lib/language';
import { mediaUrl } from '../../lib/media';
import { publicPath } from '../../lib/routing';
import { setSeo } from '../../lib/seo';
import { isValidTourCode, normalizeTourCode, saveParticipantTourSession } from '../../lib/tourSession';

export function LandingPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [content, setContent] = useState<SiteContent>();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [landingLanguage, setLandingLanguage] = useState<LanguageCode>(getPersistedLanguage() ?? defaultLanguageCode);
  const [isLanguageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [isJoinTourOpen, setJoinTourOpen] = useState(false);
  const [tourCode, setTourCode] = useState('');
  const [tourMessage, setTourMessage] = useState('');
  const [tourError, setTourError] = useState('');
  const [isTourSubmitting, setTourSubmitting] = useState(false);

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

  async function joinTour(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeTourCode(tourCode);
    setTourCode(normalized);
    setTourError('');
    setTourMessage('');
    if (!isValidTourCode(normalized)) {
      setTourError(t(landingLanguage, 'tourWrongCode'));
      return;
    }
    setTourSubmitting(true);
    try {
      const tour = await tourRepository.joinActiveTour(normalized);
      if (!tour) {
        setTourError(t(landingLanguage, 'tourUnavailable'));
        return;
      }
      saveParticipantTourSession({ tourId: tour.id, code: tour.code, expiresAt: tour.expiresAt });
      setJoinTourOpen(false);
      setTourCode('');
      setTourMessage(t(landingLanguage, 'tourJoined'));
    } catch (caught) {
      setTourError(caught instanceof Error ? caught.message : t(landingLanguage, 'tourUnavailable'));
    } finally {
      setTourSubmitting(false);
    }
  }

  if (!content) return <LoadingState label="Preparando Vive Utrera" />;
  const specialCollaborators = collaborators.filter((collaborator) => collaborator.isSpecial);
  const generalCollaborators = collaborators.filter((collaborator) => !collaborator.isSpecial);

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
          <PublicUserMenu />
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

        <section className="section tours-section" aria-label={t(landingLanguage, 'tours')}>
          <div className="section-heading">
            <h2>{t(landingLanguage, 'tours')}</h2>
          </div>
          <div className="tour-action-grid">
            <Card className="tour-action-card">
              <Users size={32} />
              <h3>{t(landingLanguage, 'joinTour')}</h3>
              <p>{t(landingLanguage, 'joinTourText')}</p>
              <Button type="button" onClick={() => setJoinTourOpen(true)}>{t(landingLanguage, 'joinTour')}</Button>
            </Card>
          </div>
        </section>

        <section className="section feature-section" aria-label="Funciones principales">
          <div className="feature-strip">
            <article>
              <Link className="feature-icon feature-icon-link" to="/host/login" aria-label="Acceso anfitriones"><Headphones size={34} /></Link>
              <div>
                <h2>AUDIOGUÍAS</h2>
                <p>Recorridos con relatos sonoros para escuchar a tu ritmo.</p>
              </div>
            </article>
            <article>
              <Link className="feature-icon feature-icon-link" to="/admin" aria-label="Acceso administracion"><Landmark size={34} /></Link>
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
            {content.collaboratorSectionText ? <p>{content.collaboratorSectionText}</p> : null}
          </div>
          {specialCollaborators.length ? (
            <div className="special-collaborators" aria-label="Colaboradores especiales">
              {specialCollaborators.map((collaborator) => (
                <SpecialCollaboratorCard key={collaborator.id} collaborator={collaborator} language={landingLanguage} label={content.specialCollaboratorLabel} />
              ))}
            </div>
          ) : null}
          {generalCollaborators.length ? (
            <div className="collaborator-carousel" aria-label="Colaboradores">
              <div className={generalCollaborators.length > 1 ? 'collaborator-track is-animated' : 'collaborator-track'}>
                {generalCollaborators.map((collaborator) => (
                  <CollaboratorCard key={collaborator.id} collaborator={collaborator} language={landingLanguage} />
                ))}
                {generalCollaborators.length > 1 ? generalCollaborators.map((collaborator) => (
                  <CollaboratorCard key={`${collaborator.id}-copy`} collaborator={collaborator} language={landingLanguage} ariaHidden />
                )) : null}
              </div>
            </div>
          ) : specialCollaborators.length ? null : (
            <p className="hint">Los colaboradores se mostraran cuando esten configurados.</p>
          )}
        </section>
      </main>
      <Modal title={t(landingLanguage, 'enterTourCode')} isOpen={isJoinTourOpen} onClose={() => setJoinTourOpen(false)}>
        <form className="stack-form modal-form" onSubmit={joinTour}>
          {tourError ? <div className="state state-error">{tourError}</div> : null}
          <FormField label={t(landingLanguage, 'tourCode')} value={tourCode} onChange={(event) => setTourCode(normalizeTourCode(event.target.value))} placeholder="58321F" maxLength={6} required />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setJoinTourOpen(false)} disabled={isTourSubmitting}>{t(landingLanguage, 'close')}</Button>
            <Button type="submit" disabled={isTourSubmitting}>{isTourSubmitting ? t(landingLanguage, 'joiningTour') : t(landingLanguage, 'joinTour')}</Button>
          </div>
        </form>
      </Modal>
      <Modal title={t(landingLanguage, 'tourActive')} isOpen={Boolean(tourMessage)} onClose={() => setTourMessage('')}>
        <p>{tourMessage}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setTourMessage('')}>{t(landingLanguage, 'close')}</Button>
        </div>
      </Modal>
      <PublicFooter />
    </>
  );
}

function SpecialCollaboratorCard({ collaborator, language, label }: { collaborator: Collaborator; language: LanguageCode; label?: string }) {
  const translation = collaboratorTranslation(collaborator, language);
  const content = (
    <>
      {collaborator.mediaAsset ? <img src={mediaUrl(collaborator.mediaAsset.objectKey)} alt={translation.displayName} loading="lazy" /> : null}
      <div>
        {label ? <p className="special-collaborator-kicker">{label}</p> : null}
        {collaborator.showName ? <h3>{translation.displayName}</h3> : null}
        {translation.thankYouText ? <p>{translation.thankYouText}</p> : null}
      </div>
      {collaborator.url ? <ExternalLink className="special-collaborator-link-icon" size={18} aria-hidden="true" /> : null}
    </>
  );

  return collaborator.url ? (
    <a className="special-collaborator" href={collaborator.url} target="_blank" rel="noreferrer" aria-label={translation.displayName}>
      {content}
    </a>
  ) : (
    <article className="special-collaborator">
      {content}
    </article>
  );
}

function CollaboratorCard({ collaborator, language, ariaHidden = false }: { collaborator: Collaborator; language: LanguageCode; ariaHidden?: boolean }) {
  const translation = collaboratorTranslation(collaborator, language);
  const content = (
    <>
      {collaborator.mediaAsset ? <img src={mediaUrl(collaborator.mediaAsset.objectKey)} alt={translation.displayName} loading="lazy" /> : null}
      {collaborator.showName ? <span>{translation.displayName}</span> : null}
      {collaborator.url ? <ExternalLink size={14} /> : null}
    </>
  );

  return collaborator.url ? (
    <a className="collaborator" href={collaborator.url} target="_blank" rel="noreferrer" aria-label={translation.displayName} aria-hidden={ariaHidden} tabIndex={ariaHidden ? -1 : undefined}>
      {content}
    </a>
  ) : (
    <div className="collaborator" aria-label={translation.displayName} aria-hidden={ariaHidden}>
      {content}
    </div>
  );
}

function collaboratorTranslation(collaborator: Collaborator, language: LanguageCode) {
  return collaborator.translations[language] ?? collaborator.translations.es;
}

function flagPath(language: LanguageCode, round: boolean) {
  return `flags/flag-${language}${round ? '-round' : ''}.png`;
}

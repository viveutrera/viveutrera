import { ArrowRight, Map } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ActiveTourIndicator } from '../../components/ActiveTourIndicator';
import { LanguageSelector } from '../../components/LanguageSelector';
import { PublicFooter } from '../../components/PublicFooter';
import { PublicUserMenu } from '../../components/PublicUserMenu';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { GuideRoute, Language, LanguageCode } from '../../domain/types';
import { t } from '../../i18n/ui';
import { defaultLanguageCode, getPersistedLanguage, isLanguageCode, persistLanguage } from '../../lib/language';
import { mediaObjectKey, mediaUrl } from '../../lib/media';
import { setSeo } from '../../lib/seo';

export function RoutesPage() {
  const { idioma } = useParams();
  const requestedLanguage = idioma ? (isLanguageCode(idioma) ? idioma : undefined) : undefined;
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState<LanguageCode>(requestedLanguage ?? getPersistedLanguage() ?? defaultLanguageCode);
  const [routes, setRoutes] = useState<GuideRoute[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const nextLanguage = requestedLanguage ?? getPersistedLanguage() ?? defaultLanguageCode;
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
    setLoading(true);
    setError('');
    Promise.all([
      guideRepository.getLanguages(),
      guideRepository.getRoutes(nextLanguage)
    ]).then(([languageRows, routeRows]) => {
      setLanguages(languageRows);
      setRoutes(routeRows);
      setSeo({
        title: `${t(nextLanguage, 'routes')} - Vive Utrera`,
        description: t(nextLanguage, 'routesPageIntro'),
        path: `/rutas/${nextLanguage}`,
        language: nextLanguage
      });
    }).catch((caught) => {
      setError(caught instanceof Error ? caught.message : t(nextLanguage, 'routesUnavailable'));
    }).finally(() => setLoading(false));
  }, [requestedLanguage]);

  if (idioma && !requestedLanguage) return <Navigate to={`/rutas/${language}`} replace />;

  return (
    <>
      <main className="guide-page routes-page">
        <div className="guide-language-bar">
          <ActiveTourIndicator />
          <div className="public-top-actions">
            <LanguageSelector current={language} languages={languages} pathFor={(code) => `/rutas/${code}`} />
            <PublicUserMenu />
          </div>
        </div>

        <header className="guide-header">
          <Link to="/preview" className="guide-brand-link" aria-label="Vive Utrera">
            <span>VIVE</span>
            <span>UTRERA</span>
          </Link>
          <h1>{t(language, 'routes')}</h1>
          <p>{t(language, 'routesSubtitle')}</p>
        </header>

        <section className="tour-page-intro">
          <p>{t(language, 'routesPageIntro')}</p>
        </section>

        {isLoading ? <LoadingState label="Cargando rutas" /> : null}
        {error ? <EmptyState title={t(language, 'routesUnavailable')} message={error} /> : null}
        {!isLoading && !error && routes.length === 0 ? <EmptyState title={t(language, 'noRoutes')} message={t(language, 'noRoutesText')} /> : null}

        {routes.length ? (
          <section className="element-grid route-grid" aria-label={t(language, 'routes')}>
            {routes.map((route) => <RouteCard key={route.id} route={route} language={language} />)}
          </section>
        ) : null}
      </main>
      <PublicFooter />
    </>
  );
}

function RouteCard({ route, language }: { route: GuideRoute; language: LanguageCode }) {
  const translation = route.translations[language];
  const imageAsset = route.mediaAsset ?? route.elements.find((element) => element.images[0])?.images[0]?.mediaAsset;

  return (
    <Card className="element-card route-card">
      <div className="element-card-media route-card-media" aria-hidden="true">
        {imageAsset ? <img src={mediaUrl(mediaObjectKey(imageAsset, 'thumbnail'))} alt="" loading="lazy" /> : <div className="media-placeholder"><Map size={34} /></div>}
      </div>
      <div>
        <h2>{translation.name}</h2>
        <p>{translation.description}</p>
        {route.elements[0] ? (
          <ButtonLink to={`/guia/${language}/elemento/${route.elements[0].slug}`} variant="secondary">
            {t(language, 'startRoute')} <ArrowRight size={16} />
          </ButtonLink>
        ) : null}
      </div>
    </Card>
  );
}

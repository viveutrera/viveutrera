import { ArrowLeft, ArrowRight, Map } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PublicFooter } from '../../components/PublicFooter';
import { PublicTopNav } from '../../components/PublicTopNav';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { GuideRoute, Language, LanguageCode } from '../../domain/types';
import { t } from '../../i18n/ui';
import { defaultLanguageCode, getPersistedLanguage, isLanguageCode, persistLanguage } from '../../lib/language';
import { mediaObjectKey, mediaUrl } from '../../lib/media';
import { startRoute } from '../../lib/routeSession';
import { setSeo } from '../../lib/seo';

export function RouteDetailPage() {
  const { idioma, slug } = useParams();
  const requestedLanguage = idioma ? (isLanguageCode(idioma) ? idioma : undefined) : undefined;
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState<LanguageCode>(requestedLanguage ?? getPersistedLanguage() ?? defaultLanguageCode);
  const [route, setRoute] = useState<GuideRoute>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const nextLanguage = requestedLanguage ?? getPersistedLanguage() ?? defaultLanguageCode;
    let isCurrent = true;
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
    setLoading(true);
    setError('');
    setRoute(undefined);
    Promise.all([guideRepository.getLanguages(), guideRepository.getRoutes(nextLanguage)])
      .then(([languageRows, routeRows]) => {
        if (!isCurrent) return;
        const matchingRoute = routeRows.find((candidate) => candidate.slug === slug);
        setLanguages(languageRows);
        setRoute(matchingRoute);
        if (matchingRoute) {
          const translation = matchingRoute.translations[nextLanguage];
          setSeo({
            title: `${translation.seoTitle || translation.name} - Vive Utrera`,
            description: translation.seoDescription || translation.description,
            path: `/rutas/${nextLanguage}/${matchingRoute.slug}`,
            language: nextLanguage
          });
        }
      })
      .catch((caught) => {
        if (isCurrent) setError(caught instanceof Error ? caught.message : t(nextLanguage, 'routesUnavailable'));
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => { isCurrent = false; };
  }, [requestedLanguage, slug]);

  if (idioma && !requestedLanguage) return <Navigate to={`/rutas/${language}`} replace />;

  const translation = route?.translations[language];
  const imageAsset = route?.mediaAsset ?? route?.elements.find((element) => element.images[0])?.images[0]?.mediaAsset;

  function beginRoute() {
    if (!route?.elements.length) return;
    startRoute(route.id, 0);
    navigate(`/guia/${language}/elemento/${route.elements[0].slug}`);
  }

  return (
    <>
      <PublicTopNav current={language} languages={languages} pathForLanguage={(code) => `/rutas/${code}/${slug ?? ''}`} />
      <main className="guide-page route-detail-page">
        <Link className="route-back-link" to={`/rutas/${language}`}><ArrowLeft size={18} /> {t(language, 'backToRoutes')}</Link>
        {isLoading ? <LoadingState label="Cargando ruta" /> : null}
        {error ? <EmptyState title={t(language, 'routesUnavailable')} message={error} /> : null}
        {!isLoading && !error && !route ? <EmptyState title={t(language, 'routeNotFound')} message={t(language, 'routeNotFoundText')} /> : null}
        {route && translation ? (
          <>
            <header className="guide-header route-detail-header">
              <Link to="/preview" className="guide-brand-link" aria-label="Vive Utrera">
                <span>VIVE</span>
                <span>UTRERA</span>
              </Link>
              {imageAsset ? <img className="route-detail-cover" src={mediaUrl(mediaObjectKey(imageAsset, 'original'))} alt="" /> : null}
              <h1>{translation.name}</h1>
              <p>{translation.description}</p>
              {route.elements.length ? (
                <Button type="button" variant="primary" onClick={beginRoute}>
                  {t(language, 'startRoute')} <ArrowRight size={16} />
                </Button>
              ) : null}
            </header>
            <section className="route-detail-elements" aria-labelledby="route-elements-heading">
              <h2 id="route-elements-heading">{t(language, 'routeElements')}</h2>
              {route.elements.length ? (
                <ol className="element-grid route-detail-grid">
                  {route.elements.map((element, index) => {
                    const elementTranslation = element.translations[language];
                    const cover = element.images.find((image) => image.isCover) ?? element.images[0];
                    const detailPath = `/guia/${language}/elemento/${element.slug}`;
                    return (
                      <li key={element.id}>
                        <Card className="element-card">
                          <Link to={detailPath} className="element-card-media" aria-label={elementTranslation.name}>
                            {cover ? <img src={mediaUrl(mediaObjectKey(cover.mediaAsset, 'thumbnail'))} alt={cover.translations[language].altText} loading="lazy" /> : <div className="media-placeholder"><Map size={34} /></div>}
                          </Link>
                          <div>
                            <span className="route-element-number">{index + 1}</span>
                            <h3><Link to={detailPath}>{elementTranslation.name}</Link></h3>
                            <p>{elementTranslation.shortText}</p>
                          </div>
                        </Card>
                      </li>
                    );
                  })}
                </ol>
              ) : <EmptyState title={t(language, 'routeWithoutElements')} message="" />}
            </section>
            <ButtonLink to={`/rutas/${language}`} variant="secondary"><ArrowLeft size={16} /> {t(language, 'backToRoutes')}</ButtonLink>
          </>
        ) : null}
      </main>
      <PublicFooter />
    </>
  );
}

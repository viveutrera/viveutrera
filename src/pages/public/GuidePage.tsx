import { MapPin, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { LanguageSelector } from '../../components/LanguageSelector';
import { NearbyPlacesModal } from '../../components/NearbyPlacesModal';
import { PublicFooter } from '../../components/PublicFooter';
import { PublicUserMenu } from '../../components/PublicUserMenu';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { ElementType, GuideElement, Language, LanguageCode, SiteContent } from '../../domain/types';
import { t } from '../../i18n/ui';
import { getNearestElements, type NearbyElement } from '../../lib/geolocation';
import { defaultLanguageCode, isLanguageCode, languageName, persistLanguage, resolveLanguage } from '../../lib/language';
import { mediaObjectKey, mediaUrl } from '../../lib/media';
import { setAlternateLanguages, setSeo } from '../../lib/seo';

export function GuidePage() {
  const { idioma = 'es' } = useParams();
  const [searchParams] = useSearchParams();
  const requestedLanguage = isLanguageCode(idioma) ? idioma : undefined;
  const requestedTypeId = searchParams.get('tipo') ?? '';
  const [content, setContent] = useState<SiteContent>();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState<LanguageCode>(requestedLanguage ?? defaultLanguageCode);
  const [contentLanguage, setContentLanguage] = useState<LanguageCode>(requestedLanguage ?? defaultLanguageCode);
  const [types, setTypes] = useState<ElementType[]>([]);
  const [elements, setElements] = useState<GuideElement[]>([]);
  const [query, setQuery] = useState('');
  const [typeId, setTypeId] = useState('');
  const [isNearbyOpen, setNearbyOpen] = useState(false);
  const [isLocating, setLocating] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<NearbyElement[]>([]);
  const [nearbyError, setNearbyError] = useState('');

  useEffect(() => {
    guideRepository.getLanguages().then((languageData) => {
      const resolved = resolveLanguage(idioma, languageData);
      setLanguages(languageData);
      setLanguage(resolved);
      persistLanguage(resolved);

      Promise.all([
        guideRepository.getSiteContent(resolved),
        guideRepository.getElementTypes(),
        guideRepository.getElements(resolved)
      ]).then(async ([siteData, typeData, elementData]) => {
        let visibleElements = elementData;
        let visibleLanguage = resolved;

        if (visibleElements.length === 0 && resolved !== defaultLanguageCode) {
          visibleElements = await guideRepository.getElements(defaultLanguageCode);
          visibleLanguage = defaultLanguageCode;
        }

        setContent(siteData);
        setTypes(typeData);
        setTypeId((currentTypeId) => (
          requestedTypeId && typeData.some((type) => type.id === requestedTypeId)
            ? requestedTypeId
            : currentTypeId && typeData.some((type) => type.id === currentTypeId)
              ? currentTypeId
              : typeData[0]?.id ?? ''
        ));
        setElements(visibleElements);
        setContentLanguage(visibleLanguage);
        setSeo({
          title: siteData.seoTitle,
          description: siteData.seoDescription,
          path: `/guia/${resolved}`,
          language: resolved,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'TouristDestination',
            name: siteData.cityTitle,
            description: siteData.seoDescription
          }
        });
        setAlternateLanguages((code) => `/guia/${code}`, languageData.map((item) => item.code));
      });
    });
  }, [idioma, requestedTypeId]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return elements.filter((element) => {
      const translation = element.translations[contentLanguage];
      const typeMatch = !typeId || element.typeId === typeId;
      const textMatch = !normalized || `${translation.name} ${translation.shortText}`.toLocaleLowerCase().includes(normalized);
      return typeMatch && textMatch;
    });
  }, [contentLanguage, elements, query, typeId]);

  function locateNearbyPlaces() {
    setNearbyOpen(true);
    setNearbyError('');
    setNearbyResults([]);

    if (!('geolocation' in navigator)) {
      setNearbyError(t(language, 'nearbyUnsupported'));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = getNearestElements(elements, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setNearbyResults(nearest);
        if (nearest.length === 0) setNearbyError(t(language, 'nearbyNoCoordinates'));
        setLocating(false);
      },
      (geolocationError) => {
        setNearbyError(geolocationErrorMessage(geolocationError, language));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  if (!requestedLanguage) return <Navigate to={`/guia/${language}`} replace />;

  if (!content) return <LoadingState />;

  return (
    <>
      <main className="guide-page">
        <div className="guide-language-bar">
          <LanguageSelector current={language} languages={languages} pathFor={(code) => `/guia/${code}`} />
          <PublicUserMenu />
        </div>
        <header className="guide-header">
          <Link to="/preview" className="guide-brand-link" aria-label="Vive Utrera">
            <span>VIVE</span>
            <span>UTRERA</span>
          </Link>
          {content.cityImageObjectKey ? <img className="guide-cover" src={mediaUrl(content.cityImageObjectKey)} alt="" loading="eager" /> : null}
          <h1>{content.cityTitle}</h1>
          <p>{content.cityText}</p>
        </header>
        {contentLanguage !== language ? (
          <div className="notice" role="status">
            No hay elementos publicados en {languageName(language, languages)}. Mostrando contenido en {languageName(contentLanguage, languages)}.
          </div>
        ) : null}

        <section className="guide-tools" aria-label="Filtros">
          <label className="search-box">
            <Search size={18} />
            <span className="sr-only">{t(language, 'search')}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t(language, 'search')} />
          </label>
          <div className="nearby-tool">
            <Button type="button" variant="secondary" onClick={locateNearbyPlaces} icon={<MapPin size={18} />}>{t(language, 'whatIsNearby')}</Button>
            <small>{t(language, 'nearbyPrivacy')}</small>
          </div>
          <div className="pill-row">
            {types.map((type) => (
              <Button key={type.id} type="button" variant={typeId === type.id ? 'primary' : 'secondary'} onClick={() => setTypeId(type.id)}>
                {type.name[language]}
              </Button>
            ))}
          </div>
        </section>

        {filtered.length === 0 ? (
          <EmptyState title={t(language, 'noResults')} message="Prueba con otra busqueda o elimina filtros." />
        ) : (
          <section className="element-grid">
            {filtered.map((element) => {
              const translation = element.translations[contentLanguage];
              const cover = element.images.find((image) => image.isCover) ?? element.images[0];
              const detailPath = `/guia/${language}/elemento/${element.slug}${typeId ? `?tipo=${encodeURIComponent(typeId)}` : ''}`;
              return (
                <Card key={element.id} className="element-card">
                  <Link to={detailPath} className="element-card-media" aria-label={translation.name}>
                    {cover ? <img src={mediaUrl(mediaObjectKey(cover.mediaAsset, 'thumbnail'))} alt={cover.translations[contentLanguage].altText} loading="lazy" /> : <div className="media-placeholder">Sin imagen</div>}
                  </Link>
                  <div>
                    <h2><Link to={detailPath}>{translation.name}</Link></h2>
                    <p>{translation.shortText}</p>
                  </div>
                </Card>
              );
            })}
          </section>
        )}
      </main>
      <NearbyPlacesModal
        isOpen={isNearbyOpen}
        language={language}
        contentLanguage={contentLanguage}
        results={nearbyResults}
        types={types}
        isLocating={isLocating}
        error={nearbyError}
        selectedTypeId={typeId}
        onRelocate={locateNearbyPlaces}
        onClose={() => setNearbyOpen(false)}
      />
      <PublicFooter />
    </>
  );
}

function geolocationErrorMessage(error: GeolocationPositionError, language: LanguageCode) {
  if (error.code === error.PERMISSION_DENIED) return t(language, 'nearbyPermissionDenied');
  if (error.code === error.POSITION_UNAVAILABLE) return t(language, 'nearbyUnavailable');
  if (error.code === error.TIMEOUT) return t(language, 'nearbyTimeout');
  return t(language, 'nearbyUnavailable');
}

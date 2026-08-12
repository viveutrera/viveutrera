import { MapPin, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ActiveTourIndicator } from '../../components/ActiveTourIndicator';
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
import { haversineDistanceMeters, type NearbyElement } from '../../lib/geolocation';
import { defaultLanguageCode, isLanguageCode, languageName, persistLanguage, resolveLanguage } from '../../lib/language';
import { mediaObjectKey, mediaUrl } from '../../lib/media';
import { PAGE_SIZE } from '../../lib/pagination';
import { setAlternateLanguages, setSeo } from '../../lib/seo';

const GUIDE_STATE_KEY = 'viveutrera:guide-catalog-state';

interface SavedGuideState {
  language: LanguageCode;
  contentLanguage: LanguageCode;
  typeId: string;
  query: string;
  elements: GuideElement[];
  hasMore: boolean;
  scrollY: number;
}

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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeId, setTypeId] = useState('');
  const [isReady, setReady] = useState(false);
  const [isInitialLoading, setInitialLoading] = useState(true);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [liveMessage, setLiveMessage] = useState('');
  const [isNearbyOpen, setNearbyOpen] = useState(false);
  const [isLocating, setLocating] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<NearbyElement[]>([]);
  const [nearbyError, setNearbyError] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const skipNextPageLoadRef = useRef(false);
  const elementCountRef = useRef(0);
  const hasMoreRef = useRef(true);
  const initialLoadingRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    setReady(false);
    readyRef.current = false;
    requestIdRef.current += 1;
    guideRepository.getLanguages().then((languageData) => {
      const resolved = resolveLanguage(idioma, languageData);
      setLanguages(languageData);
      setLanguage(resolved);
      persistLanguage(resolved);

      Promise.all([
        guideRepository.getSiteContent(resolved),
        guideRepository.getElementTypes()
      ]).then(([siteData, typeData]) => {
        const saved = readSavedGuideState(resolved);
        const nextTypeId = requestedTypeId && typeData.some((type) => type.id === requestedTypeId)
          ? requestedTypeId
          : saved?.typeId && typeData.some((type) => type.id === saved.typeId)
            ? saved.typeId
            : typeData[0]?.id ?? '';
        const canRestoreSavedState = Boolean(saved && (!requestedTypeId || saved.typeId === nextTypeId));

        setContent(siteData);
        setTypes(typeData);
        setTypeId(nextTypeId);
        if (saved && canRestoreSavedState) {
          skipNextPageLoadRef.current = true;
          setQuery(saved.query);
          setDebouncedQuery(saved.query);
          setElements(saved.elements);
          setContentLanguage(saved.contentLanguage);
          setHasMore(saved.hasMore);
          setInitialLoading(false);
          requestAnimationFrame(() => window.scrollTo({ top: saved.scrollY }));
        } else {
          setQuery('');
          setDebouncedQuery('');
          setElements([]);
          setContentLanguage(resolved);
          setHasMore(true);
          setInitialLoading(true);
        }
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
        setReady(true);
        readyRef.current = true;
      });
    });
  }, [idioma, requestedTypeId]);

  useEffect(() => {
    elementCountRef.current = elements.length;
  }, [elements.length]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
    initialLoadingRef.current = isInitialLoading;
    loadingMoreRef.current = isLoadingMore;
    readyRef.current = isReady;
  }, [hasMore, isInitialLoading, isLoadingMore, isReady]);

  useEffect(() => {
    const debounce = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(debounce);
  }, [query]);

  const persistCurrentState = useCallback((scrollY = window.scrollY) => {
    if (!isReady) return;
    writeSavedGuideState({
      language,
      contentLanguage,
      typeId,
      query,
      elements,
      hasMore,
      scrollY
    });
  }, [contentLanguage, elements, hasMore, isReady, language, query, typeId]);

  useEffect(() => {
    const remember = () => persistCurrentState(window.scrollY);
    window.addEventListener('pagehide', remember);
    return () => window.removeEventListener('pagehide', remember);
  }, [persistCurrentState]);

  const loadPage = useCallback(async (mode: 'reset' | 'append') => {
    if (!readyRef.current || (mode === 'append' && (!hasMoreRef.current || loadingMoreRef.current || initialLoadingRef.current))) return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const offset = mode === 'reset' ? 0 : elementCountRef.current;

    setLoadError('');
    if (mode === 'reset') {
      initialLoadingRef.current = true;
      setInitialLoading(true);
      setElements([]);
      elementCountRef.current = 0;
      window.scrollTo({ top: 0 });
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    try {
      const page = await guideRepository.getElementPage(language, {
        offset,
        limit: PAGE_SIZE,
        typeId,
        search: debouncedQuery
      });
      if (requestId !== requestIdRef.current) return;
      setContentLanguage(page.contentLanguage);
      setHasMore(page.hasMore);
      hasMoreRef.current = page.hasMore;
      setElements((current) => {
        const next = mode === 'reset' ? page.items : appendUniqueElements(current, page.items);
        elementCountRef.current = next.length;
        if (mode === 'append' && page.items.length) setLiveMessage(`Se han cargado ${page.items.length} lugares mas.`);
        return next;
      });
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(caught instanceof Error ? caught.message : 'No se pudieron cargar mas lugares.');
      if (mode === 'reset') {
        setHasMore(false);
        hasMoreRef.current = false;
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setInitialLoading(false);
        setLoadingMore(false);
        initialLoadingRef.current = false;
        loadingMoreRef.current = false;
      }
    }
  }, [debouncedQuery, language, typeId]);

  useEffect(() => {
    if (!isReady) return;
    if (skipNextPageLoadRef.current) {
      skipNextPageLoadRef.current = false;
      return;
    }
    loadPage('reset');
  }, [debouncedQuery, isReady, loadPage, typeId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isInitialLoading || isLoadingMore) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadPage('append');
    }, { rootMargin: '520px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isInitialLoading, isLoadingMore, loadPage]);

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
      async (position) => {
        try {
          const origin = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          const candidates = await guideRepository.getNearbyElementCandidates(contentLanguage);
          const nearestCandidates = candidates
            .map((candidate) => ({
              candidate,
              distanceMeters: haversineDistanceMeters(origin, {
                latitude: candidate.latitude,
                longitude: candidate.longitude
              })
            }))
            .sort((left, right) => left.distanceMeters - right.distanceMeters)
            .slice(0, 3);
          const nearestElements = await guideRepository.getElementsByIds(contentLanguage, nearestCandidates.map((item) => item.candidate.id));
          const distances = new Map(nearestCandidates.map((item) => [item.candidate.id, item.distanceMeters]));
          const nearest = nearestElements.map((element) => ({
            element,
            distanceMeters: distances.get(element.id) ?? 0
          }));
          setNearbyResults(nearest);
          if (nearest.length === 0) setNearbyError(t(language, 'nearbyNoCoordinates'));
        } catch (caught) {
          setNearbyError(caught instanceof Error ? caught.message : t(language, 'nearbyUnavailable'));
        } finally {
          setLocating(false);
        }
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

  const isEmpty = !isInitialLoading && elements.length === 0;

  return (
    <>
      <main className="guide-page">
        <div className="guide-language-bar">
          <ActiveTourIndicator />
          <div className="public-top-actions">
            <LanguageSelector current={language} languages={languages} pathFor={(code) => `/guia/${code}`} />
            <PublicUserMenu />
          </div>
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

        {isInitialLoading ? (
          <LoadingState label="Cargando lugares" />
        ) : null}

        {loadError && elements.length === 0 ? (
          <EmptyState title="No se pudo cargar" message={loadError} />
        ) : null}

        {isEmpty && !loadError ? (
          <EmptyState title={t(language, 'noResults')} message="Prueba con otra busqueda o elimina filtros." />
        ) : null}

        {elements.length ? (
          <>
            <section className="element-grid">
              {elements.map((element) => {
                const translation = element.translations[contentLanguage];
                const cover = element.images.find((image) => image.isCover) ?? element.images[0];
                const detailPath = `/guia/${language}/elemento/${element.slug}${typeId ? `?tipo=${encodeURIComponent(typeId)}` : ''}`;
                return (
                  <Card key={element.id} className="element-card">
                    <Link to={detailPath} className="element-card-media" aria-label={translation.name} onClick={() => persistCurrentState()}>
                      {cover ? <img src={mediaUrl(mediaObjectKey(cover.mediaAsset, 'thumbnail'))} alt={cover.translations[contentLanguage].altText} loading="lazy" /> : <div className="media-placeholder">Sin imagen</div>}
                    </Link>
                    <div>
                      <h2><Link to={detailPath} onClick={() => persistCurrentState()}>{translation.name}</Link></h2>
                      <p>{translation.shortText}</p>
                    </div>
                  </Card>
                );
              })}
            </section>
            <div className="guide-load-more" ref={sentinelRef}>
              {isLoadingMore ? <p role="status">Cargando mas lugares...</p> : null}
              {loadError && elements.length ? <p className="state state-error" role="alert">{loadError}</p> : null}
              {hasMore ? (
                <Button type="button" variant="secondary" onClick={() => loadPage('append')} disabled={isLoadingMore || isInitialLoading}>
                  {isLoadingMore ? 'Cargando...' : 'Mostrar mas lugares'}
                </Button>
              ) : null}
            </div>
            <p className="sr-only" aria-live="polite">{liveMessage}</p>
          </>
        ) : null}
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

function appendUniqueElements(current: GuideElement[], incoming: GuideElement[]) {
  const existing = new Set(current.map((element) => element.id));
  return [...current, ...incoming.filter((element) => !existing.has(element.id))];
}

function readSavedGuideState(language: LanguageCode): SavedGuideState | undefined {
  try {
    const raw = sessionStorage.getItem(GUIDE_STATE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as SavedGuideState;
    if (parsed.language !== language || !Array.isArray(parsed.elements)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeSavedGuideState(state: SavedGuideState) {
  try {
    sessionStorage.setItem(GUIDE_STATE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

function geolocationErrorMessage(error: GeolocationPositionError, language: LanguageCode) {
  if (error.code === error.PERMISSION_DENIED) return t(language, 'nearbyPermissionDenied');
  if (error.code === error.POSITION_UNAVAILABLE) return t(language, 'nearbyUnavailable');
  if (error.code === error.TIMEOUT) return t(language, 'nearbyTimeout');
  return t(language, 'nearbyUnavailable');
}

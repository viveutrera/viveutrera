import { ExternalLink, MapPin, Radio, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AudioPlayer } from '../../components/AudioPlayer';
import { GalleryLightbox } from '../../components/GalleryLightbox';
import { NearbyPlacesModal } from '../../components/NearbyPlacesModal';
import { PublicFooter } from '../../components/PublicFooter';
import { PublicTopNav } from '../../components/PublicTopNav';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import { tourRepository } from '../../data/supabaseRepository';
import type { ElementType, GuideElement, GuideRoute, Language, LanguageCode, Tour } from '../../domain/types';
import { t } from '../../i18n/ui';
import { defaultLanguageCode, isLanguageCode, languageName, persistLanguage, resolveLanguage } from '../../lib/language';
import { hasValidCoordinates, haversineDistanceMeters, type NearbyElement } from '../../lib/geolocation';
import { mediaObjectKey, mediaUrl } from '../../lib/media';
import { broadcastTourElement } from '../../lib/realtimeTourService';
import {
  finishRoute,
  getActiveRouteSession,
  setRouteCurrentIndex,
  startRoute,
  subscribeRouteSessionChange,
  type ActiveRouteSession
} from '../../lib/routeSession';
import { setAlternateLanguages, setSeo } from '../../lib/seo';
import { useAuth } from '../../routes/authContext';

export function ElementDetailPage() {
  const { isHost } = useAuth();
  const navigate = useNavigate();
  const { idioma = 'es', slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const requestedLanguage = isLanguageCode(idioma) ? idioma : undefined;
  const selectedTypeId = searchParams.get('tipo') ?? '';
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState<LanguageCode>(requestedLanguage ?? defaultLanguageCode);
  const [contentLanguage, setContentLanguage] = useState<LanguageCode>(requestedLanguage ?? defaultLanguageCode);
  const [element, setElement] = useState<GuideElement>();
  const [siblings, setSiblings] = useState<GuideElement[]>([]);
  const [routes, setRoutes] = useState<GuideRoute[]>([]);
  const [activeRouteSession, setActiveRouteSession] = useState<ActiveRouteSession | undefined>(() => getActiveRouteSession());
  const [types, setTypes] = useState<ElementType[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [showLongText, setShowLongText] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | undefined>();
  const [activeAudioId, setActiveAudioId] = useState<string>();
  const [activeTours, setActiveTours] = useState<Tour[]>([]);
  const [sendTourId, setSendTourId] = useState<string>();
  const [tourMessage, setTourMessage] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [isSendingTour, setSendingTour] = useState(false);
  const [isNearbyOpen, setNearbyOpen] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<NearbyElement[]>([]);
  const [nearbyError, setNearbyError] = useState('');

  useEffect(() => {
    setLoading(true);
    guideRepository.getLanguages().then((languageData) => {
      const resolved = resolveLanguage(idioma, languageData);
      setLanguages(languageData);
      setLanguage(resolved);
      persistLanguage(resolved);

      Promise.all([
        guideRepository.getElementBySlug(resolved, slug),
        guideRepository.getElementNavigation(resolved),
        guideRepository.getElementTypes(),
        guideRepository.getRoutes(resolved)
      ]).then(async ([elementData, siblingData, typeData, routeData]) => {
        let visibleElement = elementData;
        let visibleSiblings = siblingData;
        let visibleLanguage = resolved;
        let visibleRoutes = routeData;

        if (!visibleElement && resolved !== defaultLanguageCode) {
          [visibleElement, visibleSiblings, visibleRoutes] = await Promise.all([
            guideRepository.getElementBySlug(defaultLanguageCode, slug),
            guideRepository.getElementNavigation(defaultLanguageCode),
            guideRepository.getRoutes(defaultLanguageCode)
          ]);
          visibleLanguage = defaultLanguageCode;
        }

        setElement(visibleElement);
        setShowLongText(visibleElement?.showLongTextDefault ?? false);
        setSiblings(visibleSiblings);
        setTypes(typeData);
        setRoutes(visibleRoutes);
        setContentLanguage(visibleLanguage);

        if (visibleElement) {
          const translation = visibleElement.translations[visibleLanguage];
          setSeo({
            title: translation.seoTitle,
            description: translation.seoDescription,
            path: `/guia/${resolved}/elemento/${visibleElement.slug}`,
            language: resolved,
            type: 'article',
            jsonLd: {
              '@context': 'https://schema.org',
              '@type': 'TouristAttraction',
              name: translation.name,
              description: translation.seoDescription || translation.shortText
            }
          });
          setAlternateLanguages((code) => `/guia/${code}/elemento/${visibleElement.slug}`, languageData.map((item) => item.code));
        }
        setLoading(false);
      });
    }).catch(() => {
      setLoading(false);
    });
  }, [idioma, slug]);

  useEffect(() => subscribeRouteSessionChange(() => setActiveRouteSession(getActiveRouteSession())), []);

  useEffect(() => {
    if (!isHost) return undefined;
    tourRepository.listMyTours()
      .then((rows) => setActiveTours(rows.filter(isActiveAvailableTour)))
      .catch(() => setActiveTours([]));
    return undefined;
  }, [isHost]);

  if (!requestedLanguage) return <Navigate to={`/guia/${language}/elemento/${slug}`} replace />;
  if (isLoading) return <LoadingState />;
  if (!element) return <EmptyState title="Recurso no encontrado" message="El elemento no existe o no esta publicado en este idioma." />;

  const translation = element.translations[contentLanguage];
  const type = types.find((item) => item.id === element.typeId);
  const audios = element.audios.filter((audio) => audio.languageCode === contentLanguage && audio.isPublished);
  const links = element.links.filter((link) => link.languageCode === contentLanguage && link.isPublished);
  const typeQuery = selectedTypeId ? `?tipo=${encodeURIComponent(selectedTypeId)}` : '';
  const backPath = `/guia/${language}${typeQuery}`;
  const selectedTour = activeTours.find((tour) => tour.id === sendTourId);
  const featuredImageCaption = element.images[0]?.translations[contentLanguage].caption?.trim();
  const canShowNearbyPlaces = hasValidCoordinates(element);
  const activeRoute = routes.find((route) => route.id === activeRouteSession?.routeId);
  const activeRouteIndex = activeRoute?.elements.findIndex((item) => item.id === element.id) ?? -1;
  const isElementInActiveRoute = Boolean(activeRoute && activeRouteIndex >= 0);
  const activeRouteReturnElement = activeRoute?.elements[Math.min(activeRouteSession?.currentIndex ?? 0, Math.max(activeRoute.elements.length - 1, 0))] ?? activeRoute?.elements[0];

  async function sendElementToTour() {
    if (!selectedTour || !element) return;
    setSendingTour(true);
    try {
      const event = await tourRepository.sendElementToTour(selectedTour.id, element.id);
      await broadcastTourElement(selectedTour.id, event);
      setSendTourId(undefined);
      setTourMessage('Elemento enviado al tour.');
    } catch (caught) {
      setTourMessage(caught instanceof Error ? caught.message : 'No se pudo enviar el elemento al tour.');
    } finally {
      setSendingTour(false);
    }
  }

  async function showNearbyPlaces() {
    const currentElement = element;
    if (!currentElement || !hasValidCoordinates(currentElement)) return;
    setNearbyOpen(true);
    setNearbyError('');
    setNearbyResults([]);

    const origin = {
      latitude: currentElement.latitude as number,
      longitude: currentElement.longitude as number
    };
    const nearestCandidates = siblings
      .filter((candidate) => candidate.id !== currentElement.id && candidate.typeId === currentElement.typeId && hasValidCoordinates(candidate))
      .map((candidate) => ({
        candidate,
        distanceMeters: haversineDistanceMeters(origin, {
          latitude: candidate.latitude as number,
          longitude: candidate.longitude as number
        })
      }))
      .sort((left, right) => left.distanceMeters - right.distanceMeters)
      .slice(0, 3);

    try {
      const nearestElements = await guideRepository.getElementsByIds(contentLanguage, nearestCandidates.map((item) => item.candidate.id));
      const distances = new Map(nearestCandidates.map((item) => [item.candidate.id, item.distanceMeters]));
      const nearest = nearestElements.map((nearbyElement) => ({
        element: nearbyElement,
        distanceMeters: distances.get(nearbyElement.id) ?? 0
      }));
      setNearbyResults(nearest);
      if (nearest.length === 0) setNearbyError(t(language, 'nearbyNoCoordinates'));
    } catch (caught) {
      setNearbyError(caught instanceof Error ? caught.message : t(language, 'nearbyUnavailable'));
    }
  }

  async function shareElement() {
    const currentElement = element;
    if (!currentElement) return;
    const shareUrl = `${window.location.origin}/guia/${language}/elemento/${currentElement.slug}`;
    const shareData = {
      title: translation.name,
      text: translation.shortText,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage('Enlace copiado.');
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setShareMessage('No se pudo compartir el enlace.');
    }
  }

  function goToRouteElement(index: number) {
    if (!activeRoute) return;
    const target = activeRoute.elements[index];
    if (!target) return;
    startRoute(activeRoute.id, index);
    navigate(`/guia/${language}/elemento/${target.slug}`);
  }

  function finishActiveRoute() {
    finishRoute();
    setActiveRouteSession(undefined);
  }

  function returnToActiveRoute() {
    if (!activeRoute || !activeRouteReturnElement) return;
    const index = activeRoute.elements.findIndex((item) => item.id === activeRouteReturnElement.id);
    setRouteCurrentIndex(activeRoute.id, Math.max(index, 0));
    navigate(`/guia/${language}/elemento/${activeRouteReturnElement.slug}`);
  }

  return (
    <>
      <PublicTopNav current={language} languages={languages} pathForLanguage={(code) => `/guia/${code}/elemento/${element.slug}`} />
      <main className="detail-page">
        {contentLanguage !== language ? (
          <div className="notice" role="status">
            Esta ficha no esta publicada en {languageName(language, languages)}. Mostrando contenido en {languageName(contentLanguage, languages)}.
          </div>
        ) : null}
        <div className="detail-kicker-row">
          <span className="tag">{type?.name[contentLanguage]}</span>
          <Link to={backPath} className="text-link">{t(language, 'back')}</Link>
        </div>
        <h1>{translation.name}</h1>
        <p className="lead">{translation.shortText}</p>
        <div className="detail-actions">
          {!element.showLongTextDefault ? (
            <Button type="button" variant="secondary" onClick={() => setShowLongText((value) => !value)}>{t(language, 'moreInfo')}</Button>
          ) : null}
          {element.mapsUrl ? (
            <div className="detail-location-share">
              <a className="button button-primary detail-location-button" href={element.mapsUrl} target="_blank" rel="noreferrer">
                <MapPin size={18} />
                <span>{t(language, 'location')}</span>
              </a>
              <Button type="button" variant="secondary" className="detail-share-button" icon={<Share2 size={18} />} onClick={shareElement} aria-label="Compartir elemento">Compartir</Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" className="detail-share-button" icon={<Share2 size={18} />} onClick={shareElement} aria-label="Compartir elemento">Compartir</Button>
          )}
          {activeTours.length ? (
            <Button type="button" icon={<Radio size={18} />} onClick={() => setSendTourId(activeTours[0].id)}>{t(language, 'sendToTour')}</Button>
          ) : null}
        </div>
        {showLongText ? <p className="long-text">{translation.longText}</p> : null}

        <section className="gallery" aria-label="Galeria">
          {element.images.length ? (
            <>
              <figure className="gallery-feature">
                <button type="button" className="gallery-open" onClick={() => setSelectedImageIndex(0)}>
                  <img src={mediaUrl(element.images[0].mediaAsset.objectKey)} alt={element.images[0].translations[contentLanguage].altText} loading="lazy" />
                </button>
                {featuredImageCaption ? <figcaption>{featuredImageCaption}</figcaption> : null}
              </figure>
              {element.images.length > 1 ? (
                <div className="gallery-thumbs" aria-label="Miniaturas">
                  {element.images.map((image, index) => (
                    <button key={image.id} type="button" onClick={() => setSelectedImageIndex(index)} aria-label={`Abrir imagen ${index + 1}`}>
                      <img src={mediaUrl(mediaObjectKey(image.mediaAsset, 'thumbnail'))} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : <div className="state">No hay imagenes publicadas para este elemento.</div>}
        </section>

        <section className="media-list">
          <h2>{t(language, 'audios')}</h2>
          {audios.length ? audios.map((audio) => (
            <AudioPlayer
              key={audio.id}
              id={audio.id}
              title={audio.title}
              src={mediaUrl(audio.mediaAsset.objectKey)}
              durationSeconds={audio.durationSeconds}
              activeAudioId={activeAudioId}
              onActivate={setActiveAudioId}
            />
          )) : <div className="state">No hay audios publicados para este idioma.</div>}
        </section>

        {activeRoute ? (
          <section className="active-route-card" aria-label={t(language, 'activeRoute')}>
            <div>
              <h2>{t(language, 'activeRoute')}: {activeRoute.translations[contentLanguage].name}</h2>
              {!isElementInActiveRoute ? <p>{t(language, 'outsideActiveRoute')}</p> : null}
            </div>
            {isElementInActiveRoute ? (
              <div className="active-route-actions">
                {activeRouteIndex > 0 ? (
                  <Button type="button" variant="secondary" onClick={() => goToRouteElement(activeRouteIndex - 1)}>{t(language, 'previousRouteElement')}</Button>
                ) : null}
                {activeRouteIndex >= activeRoute.elements.length - 1 ? (
                  <Button type="button" onClick={finishActiveRoute}>{t(language, 'finishRoute')}</Button>
                ) : (
                  <Button type="button" onClick={() => goToRouteElement(activeRouteIndex + 1)}>{t(language, 'nextRouteElement')}</Button>
                )}
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={returnToActiveRoute}>{t(language, 'returnToRoute')}</Button>
            )}
          </section>
        ) : null}

        <section className="media-list">
          <h2>{t(language, 'links')}</h2>
          {links.length ? links.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="text-link">
              {link.title} <ExternalLink size={14} />
            </a>
          )) : <div className="state">No hay enlaces complementarios publicados para este idioma.</div>}
        </section>

        {canShowNearbyPlaces ? (
          <div className="detail-pagination" aria-label="Lugares próximos">
            <Button type="button" variant="secondary" icon={<MapPin size={18} />} onClick={showNearbyPlaces}>Lugares próximos</Button>
          </div>
        ) : null}
      </main>
      <NearbyPlacesModal
        isOpen={isNearbyOpen}
        title="Lugares próximos"
        intro="Estos son los lugares del mismo tipo mas cercanos a este elemento."
        language={language}
        contentLanguage={contentLanguage}
        results={nearbyResults}
        types={types}
        isLocating={false}
        error={nearbyError}
        selectedTypeId={selectedTypeId || element.typeId}
        onClose={() => setNearbyOpen(false)}
      />
      <Modal title={t(language, 'sendToTour')} isOpen={Boolean(sendTourId)} onClose={() => setSendTourId(undefined)}>
        <div className="stack-form">
          <p>Enviar <strong>{translation.name}</strong> al tour <strong>{tourDisplayName(selectedTour)}</strong>.</p>
          {activeTours.length > 1 ? (
            <label className="form-field">
              <span>Tour activo</span>
              <select value={sendTourId} onChange={(event) => setSendTourId(event.target.value)}>
                {activeTours.map((tour) => <option key={tour.id} value={tour.id}>{tourDisplayName(tour)}</option>)}
              </select>
            </label>
          ) : null}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setSendTourId(undefined)} disabled={isSendingTour}>{t(language, 'close')}</Button>
            <Button type="button" onClick={sendElementToTour} disabled={isSendingTour}>{isSendingTour ? 'Enviando...' : t(language, 'sendToTour')}</Button>
          </div>
        </div>
      </Modal>
      <Modal title="Tour" isOpen={Boolean(tourMessage)} onClose={() => setTourMessage('')}>
        <p>{tourMessage}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setTourMessage('')}>{t(language, 'close')}</Button>
        </div>
      </Modal>
      <Modal title="Compartir" isOpen={Boolean(shareMessage)} onClose={() => setShareMessage('')}>
        <p>{shareMessage}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setShareMessage('')}>{t(language, 'close')}</Button>
        </div>
      </Modal>
      {selectedImageIndex !== undefined ? (
        <GalleryLightbox
          images={element.images}
          language={contentLanguage}
          selectedIndex={selectedImageIndex}
          onChangeIndex={setSelectedImageIndex}
          onClose={() => setSelectedImageIndex(undefined)}
        />
      ) : null}
      <PublicFooter />
    </>
  );
}

function tourDisplayName(tour?: Tour) {
  if (!tour) return 'seleccionado';
  return tour.name ? `${tour.code} - ${tour.name}` : tour.code;
}

function isActiveAvailableTour(tour: Tour) {
  const expiresAt = new Date(tour.expiresAt).getTime();
  return tour.status === 'active' && Number.isFinite(expiresAt) && expiresAt > Date.now();
}

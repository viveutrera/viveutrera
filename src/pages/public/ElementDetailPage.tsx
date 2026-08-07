import { ChevronLeft, ChevronRight, ExternalLink, MapPin, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AudioPlayer } from '../../components/AudioPlayer';
import { LanguageSelector } from '../../components/LanguageSelector';
import { PublicFooter } from '../../components/PublicFooter';
import { Button } from '../../components/ui/Button';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { ElementType, GuideElement, Language, LanguageCode } from '../../domain/types';
import { t } from '../../i18n/ui';
import { defaultLanguageCode, isLanguageCode, languageName, persistLanguage, resolveLanguage } from '../../lib/language';
import { mediaObjectKey, mediaUrl } from '../../lib/media';
import { setAlternateLanguages, setSeo } from '../../lib/seo';

export function ElementDetailPage() {
  const { idioma = 'es', slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const requestedLanguage = isLanguageCode(idioma) ? idioma : undefined;
  const selectedTypeId = searchParams.get('tipo') ?? '';
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState<LanguageCode>(requestedLanguage ?? defaultLanguageCode);
  const [contentLanguage, setContentLanguage] = useState<LanguageCode>(requestedLanguage ?? defaultLanguageCode);
  const [element, setElement] = useState<GuideElement>();
  const [siblings, setSiblings] = useState<GuideElement[]>([]);
  const [types, setTypes] = useState<ElementType[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [showLongText, setShowLongText] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | undefined>();
  const [activeAudioId, setActiveAudioId] = useState<string>();
  const lightboxRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const touchStartXRef = useRef<number>();
  const imageCount = element?.images.length ?? 0;

  const moveImage = useCallback((direction: -1 | 1) => {
    setSelectedImageIndex((current) => {
      if (current === undefined || imageCount === 0) return current;
      return (current + direction + imageCount) % imageCount;
    });
  }, [imageCount]);

  useEffect(() => {
    setLoading(true);
    guideRepository.getLanguages().then((languageData) => {
      const resolved = resolveLanguage(idioma, languageData);
      setLanguages(languageData);
      setLanguage(resolved);
      persistLanguage(resolved);

      Promise.all([
        guideRepository.getElementBySlug(resolved, slug),
        guideRepository.getElements(resolved),
        guideRepository.getElementTypes()
      ]).then(async ([elementData, siblingData, typeData]) => {
        let visibleElement = elementData;
        let visibleSiblings = siblingData;
        let visibleLanguage = resolved;

        if (!visibleElement && resolved !== defaultLanguageCode) {
          visibleElement = await guideRepository.getElementBySlug(defaultLanguageCode, slug);
          visibleSiblings = await guideRepository.getElements(defaultLanguageCode);
          visibleLanguage = defaultLanguageCode;
        }

        setElement(visibleElement);
        setShowLongText(visibleElement?.showLongTextDefault ?? false);
        setSiblings(visibleSiblings);
        setTypes(typeData);
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

  useEffect(() => {
    if (selectedImageIndex === undefined) return undefined;
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => lightboxCloseRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedImageIndex(undefined);
      if (event.key === 'ArrowLeft') moveImage(-1);
      if (event.key === 'ArrowRight') moveImage(1);
      if (event.key === 'Tab') trapLightboxFocus(event);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [moveImage, selectedImageIndex]);

  function trapLightboxFocus(event: KeyboardEvent) {
    const focusable = lightboxRef.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleLightboxTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.changedTouches[0]?.clientX;
  }

  function handleLightboxTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartXRef.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartXRef.current = undefined;
    if (start === undefined || end === undefined || imageCount < 2) return;
    const delta = end - start;
    if (Math.abs(delta) < 48) return;
    moveImage(delta > 0 ? -1 : 1);
  }

  if (!requestedLanguage) return <Navigate to={`/guia/${language}/elemento/${slug}`} replace />;
  if (isLoading) return <LoadingState />;
  if (!element) return <EmptyState title="Recurso no encontrado" message="El elemento no existe o no esta publicado en este idioma." />;

  const translation = element.translations[contentLanguage];
  const type = types.find((item) => item.id === element.typeId);
  const audios = element.audios.filter((audio) => audio.languageCode === contentLanguage && audio.isPublished);
  const links = element.links.filter((link) => link.languageCode === contentLanguage && link.isPublished);
  const selectedImage = selectedImageIndex === undefined ? undefined : element.images[selectedImageIndex];
  const currentIndex = siblings.findIndex((item) => item.id === element.id);
  const previous = currentIndex > 0 ? siblings[currentIndex - 1] : undefined;
  const next = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : undefined;
  const typeQuery = selectedTypeId ? `?tipo=${encodeURIComponent(selectedTypeId)}` : '';
  const backPath = `/guia/${language}${typeQuery}`;

  return (
    <>
      <main className="detail-page">
        <div className="detail-language-bar">
          <LanguageSelector current={language} languages={languages} pathFor={(code) => `/guia/${code}/elemento/${element.slug}`} />
        </div>
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
        {!element.showLongTextDefault || element.mapsUrl ? (
          <div className="detail-actions">
            {!element.showLongTextDefault ? (
              <Button type="button" variant="secondary" onClick={() => setShowLongText((value) => !value)}>{t(language, 'moreInfo')}</Button>
            ) : null}
            {element.mapsUrl ? (
              <a className="button button-primary" href={element.mapsUrl} target="_blank" rel="noreferrer">
                <MapPin size={18} />
                <span>{t(language, 'location')}</span>
              </a>
            ) : null}
          </div>
        ) : null}
        {showLongText ? <p className="long-text">{translation.longText}</p> : null}

        <section className="gallery" aria-label="Galeria">
          {element.images.length ? (
            <>
              <figure className="gallery-feature">
                <button type="button" className="gallery-open" onClick={() => setSelectedImageIndex(0)}>
                  <img src={mediaUrl(element.images[0].mediaAsset.objectKey)} alt={element.images[0].translations[contentLanguage].altText} loading="lazy" />
                </button>
                <figcaption>{element.images[0].translations[contentLanguage].caption ?? element.images[0].translations[contentLanguage].title}</figcaption>
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

        {selectedImage ? (
          <div className="lightbox" role="dialog" aria-modal="true" aria-label="Visor de imagenes" ref={lightboxRef} onTouchStart={handleLightboxTouchStart} onTouchEnd={handleLightboxTouchEnd}>
            <button ref={lightboxCloseRef} type="button" className="lightbox-close" onClick={() => setSelectedImageIndex(undefined)} aria-label="Cerrar visor">
              <X size={22} />
            </button>
            {element.images.length > 1 ? (
              <button type="button" className="lightbox-previous" onClick={() => moveImage(-1)} aria-label="Imagen anterior">
                <ChevronLeft size={28} />
              </button>
            ) : null}
            <figure>
              <img src={mediaUrl(selectedImage.mediaAsset.objectKey)} alt={selectedImage.translations[contentLanguage].altText} />
              <figcaption>{selectedImage.translations[contentLanguage].caption ?? selectedImage.translations[contentLanguage].title}</figcaption>
            </figure>
            {element.images.length > 1 ? (
              <button type="button" className="lightbox-next" onClick={() => moveImage(1)} aria-label="Imagen siguiente">
                <ChevronRight size={28} />
              </button>
            ) : null}
          </div>
        ) : null}

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

        <section className="media-list">
          <h2>{t(language, 'links')}</h2>
          {links.length ? links.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="text-link">
              {link.title} <ExternalLink size={14} />
            </a>
          )) : <div className="state">No hay enlaces complementarios publicados para este idioma.</div>}
        </section>

        <nav className="detail-pagination" aria-label="Elementos">
          {previous ? (
            <Link to={`/guia/${language}/elemento/${previous.slug}${typeQuery}`} className="button button-secondary">
              <ChevronLeft size={18} />
              <span>{previous.translations[contentLanguage].name}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/guia/${language}/elemento/${next.slug}${typeQuery}`} className="button button-secondary">
              <span>{next.translations[contentLanguage].name}</span>
              <ChevronRight size={18} />
            </Link>
          ) : null}
        </nav>
      </main>
      <PublicFooter />
    </>
  );
}

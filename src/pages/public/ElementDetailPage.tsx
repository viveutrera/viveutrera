import { ChevronLeft, ChevronRight, ExternalLink, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { LanguageSelector } from '../../components/LanguageSelector';
import { Button } from '../../components/ui/Button';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { ElementType, GuideElement, Language, LanguageCode } from '../../domain/types';
import { t } from '../../i18n/ui';
import { defaultLanguageCode, isLanguageCode, languageName, persistLanguage, resolveLanguage } from '../../lib/language';
import { formatDuration, mediaUrl } from '../../lib/media';
import { setAlternateLanguages, setSeo } from '../../lib/seo';

export function ElementDetailPage() {
  const { idioma = 'es', slug = '' } = useParams();
  const requestedLanguage = isLanguageCode(idioma) ? idioma : undefined;
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState<LanguageCode>(requestedLanguage ?? defaultLanguageCode);
  const [contentLanguage, setContentLanguage] = useState<LanguageCode>(requestedLanguage ?? defaultLanguageCode);
  const [element, setElement] = useState<GuideElement>();
  const [siblings, setSiblings] = useState<GuideElement[]>([]);
  const [types, setTypes] = useState<ElementType[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [showLongText, setShowLongText] = useState(false);

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

  if (!requestedLanguage) return <Navigate to={`/guia/${language}/elemento/${slug}`} replace />;
  if (isLoading) return <LoadingState />;
  if (!element) return <EmptyState title="Recurso no encontrado" message="El elemento no existe o no esta publicado en este idioma." />;

  const translation = element.translations[contentLanguage];
  const type = types.find((item) => item.id === element.typeId);
  const audios = element.audios.filter((audio) => audio.languageCode === contentLanguage && audio.isPublished);
  const links = element.links.filter((link) => link.languageCode === contentLanguage && link.isPublished);
  const currentIndex = siblings.findIndex((item) => item.id === element.id);
  const previous = currentIndex > 0 ? siblings[currentIndex - 1] : undefined;
  const next = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : undefined;

  return (
    <main className="detail-page">
      <Link to={`/guia/${language}`} className="text-link">{t(language, 'back')}</Link>
      <LanguageSelector current={language} languages={languages} pathFor={(code) => `/guia/${code}/elemento/${element.slug}`} />
      {contentLanguage !== language ? (
        <div className="notice" role="status">
          Esta ficha no esta publicada en {languageName(language, languages)}. Mostrando contenido en {languageName(contentLanguage, languages)}.
        </div>
      ) : null}
      <span className="tag">{type?.name[contentLanguage]}</span>
      <h1>{translation.name}</h1>
      <p className="lead">{translation.shortText}</p>
      <div className="detail-actions">
        <Button type="button" variant="secondary" onClick={() => setShowLongText((value) => !value)}>{t(language, 'moreInfo')}</Button>
        {element.mapsUrl ? (
          <a className="button button-primary" href={element.mapsUrl} target="_blank" rel="noreferrer">
            <MapPin size={18} />
            <span>{t(language, 'location')}</span>
          </a>
        ) : null}
      </div>
      {showLongText ? <p className="long-text">{translation.longText}</p> : null}

      <section className="gallery" aria-label="Galeria">
        {element.images.length ? element.images.map((image) => (
          <figure key={image.id}>
            <img src={mediaUrl(image.mediaAsset.objectKey)} alt={image.translations[contentLanguage].altText} loading="lazy" />
            <figcaption>{image.translations[contentLanguage].caption ?? image.translations[contentLanguage].title}</figcaption>
          </figure>
        )) : <div className="state">No hay imagenes publicadas para este elemento.</div>}
      </section>

      <section className="media-list">
        <h2>{t(language, 'audios')}</h2>
        {audios.length ? audios.map((audio) => (
          <article key={audio.id} className="audio-item">
            <div>
              <strong>{audio.title}</strong>
              <span>{formatDuration(audio.durationSeconds)}</span>
            </div>
            <audio controls preload="metadata" src={mediaUrl(audio.mediaAsset.objectKey)} />
          </article>
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
          <Link to={`/guia/${language}/elemento/${previous.slug}`} className="button button-secondary">
            <ChevronLeft size={18} />
            <span>{previous.translations[contentLanguage].name}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link to={`/guia/${language}/elemento/${next.slug}`} className="button button-secondary">
            <span>{next.translations[contentLanguage].name}</span>
            <ChevronRight size={18} />
          </Link>
        ) : null}
      </nav>
    </main>
  );
}

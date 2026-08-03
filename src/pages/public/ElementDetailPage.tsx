import { ExternalLink, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { ElementType, GuideElement, LanguageCode } from '../../domain/types';
import { t } from '../../i18n/ui';
import { formatDuration, mediaUrl } from '../../lib/media';

export function ElementDetailPage() {
  const { idioma = 'es', slug = '' } = useParams();
  const language = idioma as LanguageCode;
  const [element, setElement] = useState<GuideElement>();
  const [types, setTypes] = useState<ElementType[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [showLongText, setShowLongText] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      guideRepository.getElementBySlug(language, slug),
      guideRepository.getElementTypes()
    ]).then(([elementData, typeData]) => {
      setElement(elementData);
      setTypes(typeData);
      if (elementData) document.title = elementData.translations[language].seoTitle;
      document.documentElement.lang = language;
      setLoading(false);
    });
  }, [language, slug]);

  if (isLoading) return <LoadingState />;
  if (!element) return <EmptyState title="Recurso no encontrado" message="El elemento no existe o no esta publicado en este idioma." />;

  const translation = element.translations[language];
  const type = types.find((item) => item.id === element.typeId);
  const audios = element.audios.filter((audio) => audio.languageCode === language && audio.isPublished);
  const links = element.links.filter((link) => link.languageCode === language && link.isPublished);

  return (
    <main className="detail-page">
      <Link to={`/guia/${language}`} className="text-link">{t(language, 'back')}</Link>
      <span className="tag">{type?.name[language]}</span>
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
        {element.images.map((image) => (
          <figure key={image.id}>
            <img src={mediaUrl(image.mediaAsset.objectKey)} alt={image.translations[language].altText} loading="lazy" />
            <figcaption>{image.translations[language].caption ?? image.translations[language].title}</figcaption>
          </figure>
        ))}
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
        )) : <p>No hay audios publicados para este idioma.</p>}
      </section>

      <section className="media-list">
        <h2>{t(language, 'links')}</h2>
        {links.map((link) => (
          <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="text-link">
            {link.title} <ExternalLink size={14} />
          </a>
        ))}
      </section>
    </main>
  );
}

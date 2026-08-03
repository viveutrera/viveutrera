import { MapPin, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { ElementType, GuideElement, LanguageCode, SiteContent } from '../../domain/types';
import { t } from '../../i18n/ui';
import { mediaUrl } from '../../lib/media';

export function GuidePage() {
  const { idioma = 'es' } = useParams();
  const language = idioma as LanguageCode;
  const [content, setContent] = useState<SiteContent>();
  const [types, setTypes] = useState<ElementType[]>([]);
  const [elements, setElements] = useState<GuideElement[]>([]);
  const [query, setQuery] = useState('');
  const [typeId, setTypeId] = useState('all');

  useEffect(() => {
    document.documentElement.lang = language;
    Promise.all([
      guideRepository.getSiteContent(language),
      guideRepository.getElementTypes(),
      guideRepository.getElements(language)
    ]).then(([siteData, typeData, elementData]) => {
      setContent(siteData);
      setTypes(typeData);
      setElements(elementData);
      document.title = siteData.seoTitle;
    });
  }, [language]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return elements.filter((element) => {
      const translation = element.translations[language];
      const typeMatch = typeId === 'all' || element.typeId === typeId;
      const textMatch = !normalized || `${translation.name} ${translation.shortText}`.toLocaleLowerCase().includes(normalized);
      return typeMatch && textMatch;
    });
  }, [elements, language, query, typeId]);

  if (!content) return <LoadingState />;

  return (
    <main className="guide-page">
      <header className="guide-header">
        <Link to="/" className="text-link">Vive Utrera</Link>
        <h1>{content.cityTitle}</h1>
        <p>{content.cityText}</p>
      </header>

      <section className="guide-tools" aria-label="Filtros">
        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">{t(language, 'search')}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t(language, 'search')} />
        </label>
        <div className="pill-row">
          <Button type="button" variant={typeId === 'all' ? 'primary' : 'secondary'} onClick={() => setTypeId('all')}>{t(language, 'all')}</Button>
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
            const translation = element.translations[language];
            const cover = element.images.find((image) => image.isCover) ?? element.images[0];
            const type = types.find((item) => item.id === element.typeId);
            return (
              <Card key={element.id} className="element-card">
                <img src={mediaUrl(cover.mediaAsset.objectKey)} alt={cover.translations[language].altText} loading="lazy" />
                <div>
                  <span className="tag">{type?.name[language]}</span>
                  <h2>{translation.name}</h2>
                  <p>{translation.shortText}</p>
                  <Link to={`/guia/${language}/elemento/${element.slug}`} className="text-link">Ver detalle</Link>
                  {element.mapsUrl ? <MapPin size={18} aria-label={t(language, 'location')} /> : null}
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </main>
  );
}

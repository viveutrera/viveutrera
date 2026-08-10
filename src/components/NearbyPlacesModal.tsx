import { MapPin, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ElementType, LanguageCode } from '../domain/types';
import { t } from '../i18n/ui';
import { formatDistance, type NearbyElement } from '../lib/geolocation';
import { mediaObjectKey, mediaUrl } from '../lib/media';
import { Button, ButtonLink } from './ui/Button';
import { Modal } from './ui/Modal';

interface NearbyPlacesModalProps {
  isOpen: boolean;
  language: LanguageCode;
  contentLanguage: LanguageCode;
  results: NearbyElement[];
  types: ElementType[];
  isLocating: boolean;
  error?: string;
  selectedTypeId?: string;
  onRelocate: () => void;
  onClose: () => void;
}

export function NearbyPlacesModal({
  isOpen,
  language,
  contentLanguage,
  results,
  types,
  isLocating,
  error,
  selectedTypeId,
  onRelocate,
  onClose
}: NearbyPlacesModalProps) {
  return (
    <Modal isOpen={isOpen} title={t(language, 'nearbyPlacesTitle')} onClose={onClose}>
      <div className="nearby-modal">
        <p className="nearby-intro">{t(language, 'nearbyPlacesIntro')}</p>
        {isLocating ? (
          <div className="nearby-state" role="status">
            <Navigation size={22} />
            <span>{t(language, 'locating')}</span>
          </div>
        ) : null}
        {!isLocating && error ? (
          <div className="state state-error" role="alert">{error}</div>
        ) : null}
        {!isLocating && !error && results.length === 0 ? (
          <div className="state" role="status">{t(language, 'nearbyNoCoordinates')}</div>
        ) : null}
        {!isLocating && !error && results.length > 0 ? (
          <div className="nearby-results">
            {results.map(({ element, distanceMeters }) => {
              const translation = element.translations[contentLanguage];
              const type = types.find((candidate) => candidate.id === element.typeId);
              const cover = element.images.find((image) => image.isCover) ?? element.images[0];
              const detailPath = `/guia/${language}/elemento/${element.slug}${selectedTypeId ? `?tipo=${encodeURIComponent(selectedTypeId)}` : ''}`;
              return (
                <article className="nearby-result" key={element.id}>
                  <Link to={detailPath} className="nearby-thumb" aria-label={translation.name}>
                    {cover ? <img src={mediaUrl(mediaObjectKey(cover.mediaAsset, 'thumbnail'))} alt={cover.translations[contentLanguage].altText} loading="lazy" /> : <MapPin size={28} />}
                  </Link>
                  <div>
                    <div className="nearby-result-header">
                      <strong>{translation.name}</strong>
                      <span>{formatDistance(distanceMeters, language)}</span>
                    </div>
                    <small>{type?.name[language] ?? ''}</small>
                    <p>{translation.shortText}</p>
                    <ButtonLink to={detailPath} variant="secondary">{t(language, 'openPlace')}</ButtonLink>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>{t(language, 'close')}</Button>
          <Button type="button" onClick={onRelocate} disabled={isLocating} icon={<Navigation size={18} />}>{t(language, 'locateAgain')}</Button>
        </div>
      </div>
    </Modal>
  );
}

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useRef, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import type { ElementImage, LanguageCode } from '../domain/types';
import { mediaUrl } from '../lib/media';

interface GalleryLightboxProps {
  images: ElementImage[];
  language: LanguageCode;
  selectedIndex: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}

export function GalleryLightbox({ images, language, selectedIndex, onChangeIndex, onClose }: GalleryLightboxProps) {
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const touchStartXRef = useRef<number>();
  const selectedImage = images[selectedIndex];
  const imageCount = images.length;

  const moveImage = useCallback((direction: -1 | 1) => {
    if (imageCount < 2) return;
    onChangeIndex((selectedIndex + direction + imageCount) % imageCount);
  }, [imageCount, onChangeIndex, selectedIndex]);

  const trapFocus = useCallback((event: KeyboardEvent) => {
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
  }, []);

  useEffect(() => {
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => closeRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') moveImage(-1);
      if (event.key === 'ArrowRight') moveImage(1);
      if (event.key === 'Tab') trapFocus(event);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      lastFocusedRef.current?.focus();
    };
  }, [moveImage, onClose, trapFocus]);

  if (!selectedImage) return null;

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.changedTouches[0]?.clientX;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartXRef.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartXRef.current = undefined;
    if (start === undefined || end === undefined || imageCount < 2) return;
    const delta = end - start;
    if (Math.abs(delta) < 48) return;
    moveImage(delta > 0 ? -1 : 1);
  }

  const translation = selectedImage.translations[language] ?? selectedImage.translations.es;
  const caption = translation.caption ?? translation.title;

  return createPortal(
    <div
      className={imageCount > 1 ? 'lightbox' : 'lightbox lightbox-single'}
      role="dialog"
      aria-modal="true"
      aria-label="Visor de imagenes"
      ref={lightboxRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button ref={closeRef} type="button" className="lightbox-close" onClick={onClose} aria-label="Cerrar visor">
        <X size={24} />
      </button>
      {imageCount > 1 ? (
        <button type="button" className="lightbox-previous" onClick={() => moveImage(-1)} aria-label="Imagen anterior">
          <ChevronLeft size={30} />
        </button>
      ) : null}
      <figure>
        <img src={mediaUrl(selectedImage.mediaAsset.objectKey)} alt={translation.altText} />
        <figcaption>
          <span>{caption}</span>
          {imageCount > 1 ? <small>{selectedIndex + 1} / {imageCount}</small> : null}
        </figcaption>
      </figure>
      {imageCount > 1 ? (
        <button type="button" className="lightbox-next" onClick={() => moveImage(1)} aria-label="Imagen siguiente">
          <ChevronRight size={30} />
        </button>
      ) : null}
    </div>,
    document.body
  );
}

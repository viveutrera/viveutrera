import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { guideRepository } from '../data/repositories';
import { tourRepository } from '../data/supabaseRepository';
import type { GuideElement, LanguageCode, TourEvent } from '../domain/types';
import { t } from '../i18n/ui';
import { defaultLanguageCode, getPersistedLanguage } from '../lib/language';
import { getParticipantTourSession, subscribeTourSessionChange, type ParticipantTourSession } from '../lib/tourSession';
import { subscribeToTourParticipant } from '../lib/realtimeTourService';

export function TourNotification() {
  const navigate = useNavigate();
  const [event, setEvent] = useState<TourEvent>();
  const [element, setElement] = useState<GuideElement>();
  const [language, setLanguage] = useState<LanguageCode>(() => getPersistedLanguage() ?? defaultLanguageCode);
  const [session, setSession] = useState<ParticipantTourSession | undefined>(() => getParticipantTourSession());
  const lastEventIdRef = useRef<string>();

  useEffect(() => subscribeTourSessionChange(() => {
    setLanguage(getPersistedLanguage() ?? defaultLanguageCode);
    setSession(getParticipantTourSession());
  }), []);

  const loadElement = useCallback(async (elementId: string) => {
    const elements = await guideRepository.getElements(language);
    setElement(elements.find((item) => item.id === elementId));
  }, [language]);

  useEffect(() => {
    const current = getParticipantTourSession();
    if (!current) {
      setEvent(undefined);
      setElement(undefined);
      return undefined;
    }

    const handleEvent = (next: TourEvent) => {
      if (!next.elementId || next.id === lastEventIdRef.current) return;
      lastEventIdRef.current = next.id;
      setEvent(next);
      void loadElement(next.elementId);
    };

    tourRepository.getLatestTourEvent(current.tourId).then((latest) => {
      if (latest) handleEvent(latest);
    }).catch(() => undefined);

    const unsubscribe = subscribeToTourParticipant(current.tourId, current.participantToken, handleEvent, () => undefined);
    return () => {
      unsubscribe();
    };
  }, [loadElement, session?.tourId]);

  const translation = useMemo(() => element?.translations[language] ?? element?.translations.es, [element, language]);

  if (!event || !element || !translation) return null;

  function openElement() {
    if (!element) return;
    setEvent(undefined);
    navigate(`/guia/${language}/elemento/${element.slug}`);
  }

  return (
    <Modal title={t(language, 'tourNotificationTitle')} isOpen={Boolean(event)} onClose={() => setEvent(undefined)}>
      <div className="tour-notification">
        <strong>{translation.name}</strong>
        <p>{t(language, 'tourNotificationText')}</p>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={() => setEvent(undefined)}>{t(language, 'close')}</Button>
          <Button type="button" onClick={openElement}>{t(language, 'open')}</Button>
        </div>
      </div>
    </Modal>
  );
}

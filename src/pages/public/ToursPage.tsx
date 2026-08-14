import { LogOut, Radio, Users } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PublicFooter } from '../../components/PublicFooter';
import { PublicTopNav } from '../../components/PublicTopNav';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import { tourRepository } from '../../data/supabaseRepository';
import type { Language, LanguageCode } from '../../domain/types';
import { t } from '../../i18n/ui';
import { defaultLanguageCode, getPersistedLanguage, isLanguageCode, persistLanguage } from '../../lib/language';
import { setSeo } from '../../lib/seo';
import {
  clearParticipantTourSession,
  getParticipantTourSession,
  isValidTourCode,
  normalizeTourCode,
  saveParticipantTourSession,
  subscribeTourSessionChange,
  type ParticipantTourSession
} from '../../lib/tourSession';

export function ToursPage() {
  const { idioma } = useParams();
  const requestedLanguage = idioma ? (isLanguageCode(idioma) ? idioma : undefined) : undefined;
  const [languages, setLanguages] = useState<Language[]>([]);
  const [language, setLanguage] = useState<LanguageCode>(requestedLanguage ?? getPersistedLanguage() ?? defaultLanguageCode);
  const [tourCode, setTourCode] = useState('');
  const [session, setSession] = useState<ParticipantTourSession | undefined>(() => getParticipantTourSession());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    guideRepository.getLanguages()
      .then((rows) => setLanguages(rows))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const nextLanguage = requestedLanguage ?? getPersistedLanguage() ?? defaultLanguageCode;
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
  }, [requestedLanguage]);

  useEffect(() => subscribeTourSessionChange(() => setSession(getParticipantTourSession())), []);

  useEffect(() => {
    setSeo({
      title: `${t(language, 'tours')} - Vive Utrera`,
      description: t(language, 'joinTourText'),
      path: '/tours',
      language
    });
  }, [language]);

  async function joinTour(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeTourCode(tourCode);
    setTourCode(normalized);
    setError('');
    setMessage('');

    if (!isValidTourCode(normalized)) {
      setError(t(language, 'tourWrongCode'));
      return;
    }

    setSubmitting(true);
    try {
      const tour = await tourRepository.joinActiveTour(normalized);
      if (!tour) {
        setError(t(language, 'tourUnavailable'));
        return;
      }
      const nextSession = saveParticipantTourSession({ tourId: tour.id, code: tour.code, name: tour.name, expiresAt: tour.expiresAt });
      setSession(nextSession);
      setTourCode('');
      setMessage(t(language, 'tourJoined'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t(language, 'tourUnavailable'));
    } finally {
      setSubmitting(false);
    }
  }

  function leaveTour() {
    clearParticipantTourSession();
    setSession(undefined);
    setMessage(t(language, 'tourLeft'));
  }

  if (isLoading) return <LoadingState label="Cargando tours" />;
  if (idioma && !requestedLanguage) return <Navigate to={`/tours/${language}`} replace />;

  return (
    <>
      <PublicTopNav current={language} languages={languages} pathForLanguage={(code) => `/tours/${code}`} />
      <main className="guide-page tours-page">
        <header className="guide-header">
          <Link to="/preview" className="guide-brand-link" aria-label="Vive Utrera">
            <span>VIVE</span>
            <span>UTRERA</span>
          </Link>
          <h1>{t(language, 'tours')}</h1>
          <p>{t(language, 'joinTourText')}</p>
        </header>

        <section className="tour-page-intro">
          <p>{t(language, 'tourPageIntro')}</p>
        </section>

        <section className="tour-action-grid">
          <Card className="tour-action-card">
            <Users size={32} />
            <h2>{t(language, 'joinTour')}</h2>
            <p>{t(language, 'joinTourText')}</p>
            {error ? <div className="state state-error">{error}</div> : null}
            <form className="stack-form" onSubmit={joinTour}>
              <FormField label={t(language, 'tourCode')} value={tourCode} onChange={(event) => setTourCode(normalizeTourCode(event.target.value))} placeholder="58321F" maxLength={6} required />
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t(language, 'joiningTour') : t(language, 'joinTour')}</Button>
            </form>
          </Card>

          {session ? (
            <Card className="tour-action-card tour-active-card">
              <Radio size={32} />
              <h2>{t(language, 'tourActive')}</h2>
              <p>{renderTourStatus(language, session)}</p>
              <Button type="button" variant="danger" icon={<LogOut size={18} />} onClick={leaveTour}>{t(language, 'leaveTour')}</Button>
            </Card>
          ) : null}
        </section>
      </main>

      <Modal title={t(language, 'tourActive')} isOpen={Boolean(message)} onClose={() => setMessage('')}>
        <p>{message}</p>
        <div className="modal-actions">
          <Button type="button" onClick={() => setMessage('')}>{t(language, 'close')}</Button>
        </div>
      </Modal>
      <PublicFooter />
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function renderTourStatus(language: LanguageCode, session: ParticipantTourSession) {
  const [beforeCode, afterCodeTemplate = ''] = t(language, 'tourJoinedStatus').split('{code}');
  const [beforeDate, afterDate = ''] = afterCodeTemplate.split('{expiresAt}');

  return (
    <>
      {beforeCode}
      <strong>{session.code}</strong>
      {beforeDate}
      {formatDate(session.expiresAt)}
      {afterDate}
    </>
  );
}

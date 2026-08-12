import { Building2, CheckCircle2, Copy, Globe2, Headphones, Heart, PenLine, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicFooter } from '../../components/PublicFooter';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/States';
import { guideRepository } from '../../data/repositories';
import type { DonationContent } from '../../domain/types';
import { defaultLanguageCode, getPersistedLanguage } from '../../lib/language';
import { publicPath } from '../../lib/routing';
import { setSeo } from '../../lib/seo';

export function DonationPage() {
  const language = getPersistedLanguage() ?? defaultLanguageCode;
  const [content, setContent] = useState<DonationContent>();
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    guideRepository.getDonationContent().then((donationContent) => {
      setContent(donationContent);
      setSeo({
        title: `${donationContent.title} - Vive Utrera`,
        description: donationContent.subtitle,
        path: '/donativos',
        language
      });
    });
  }, [language]);

  if (!content) return <LoadingState label="Cargando donativos" />;

  async function copyBankData() {
    if (!content) return;
    const value = [
      `Titular: ${content.bankAccountHolder}`,
      `IBAN: ${content.bankIban}`,
      `Concepto: ${content.bankConcept}`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage('Datos copiados.');
    } catch {
      setCopyMessage(value);
    }
  }

  return (
    <>
      <main className="project-page project-page-donations">
        <Link className="project-top-link" to="/preview" aria-label="Volver al inicio">
          <Globe2 size={28} />
        </Link>
        <header className="project-hero">
          <img className="project-logo" src={publicPath('brand/logo-vive-utrera.png')} alt="" aria-hidden="true" />
          <p className="project-wordmark"><span>VIVE</span><strong>UTRERA</strong></p>
          <h1>{content.title}</h1>
          <p>{content.subtitle}</p>
        </header>

        <section className="donation-card">
          <span className="project-icon"><Heart size={44} /></span>
          <div>
            <h2>{content.introTitle}</h2>
            <p>{content.introText}</p>
          </div>
        </section>

        <section className="donation-card donation-card-stack">
          <span className="project-icon"><Heart size={44} /></span>
          <div>
            <h2>{content.bizumTitle}</h2>
            <p>{content.bizumText}</p>
            <p className="bizum-code">Codigo Bizum: <strong>{content.bizumCode}</strong></p>
            <a className="button button-primary donation-wide-button" href={`https://bizum.es/`} target="_blank" rel="noreferrer">
              <span>{content.bizumButtonLabel}</span>
            </a>
          </div>
        </section>

        <section className="donation-card donation-card-stack">
          <span className="project-icon"><Building2 size={44} /></span>
          <div>
            <h2>{content.bankTitle}</h2>
            <p>{content.bankText}</p>
            <dl className="bank-details">
              <div><dt>Titular:</dt><dd>{content.bankAccountHolder}</dd></div>
              <div><dt>IBAN:</dt><dd>{content.bankIban}</dd></div>
              <div><dt>Concepto:</dt><dd>{content.bankConcept}</dd></div>
            </dl>
            <Button type="button" variant="secondary" className="donation-wide-button" icon={<Copy size={20} />} onClick={copyBankData}>{content.copyButtonLabel}</Button>
            {copyMessage ? <p className="hint" role="status">{copyMessage}</p> : null}
          </div>
        </section>

        <section className="donation-card transparency-card">
          <span className="project-icon"><ShieldCheck size={44} /></span>
          <div>
            <h2>{content.transparencyTitle}</h2>
            <ul>
              {content.transparencyItems.map((item, index) => (
                <li key={item}>{transparencyIcon(index)}<span>{item}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <p className="project-closing">{content.footerText}</p>
      </main>
      <PublicFooter />
    </>
  );
}

function transparencyIcon(index: number) {
  if (index === 0) return <Globe2 size={30} />;
  if (index === 1) return <PenLine size={30} />;
  if (index === 2) return <Headphones size={30} />;
  return <CheckCircle2 size={30} />;
}

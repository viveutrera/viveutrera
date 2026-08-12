import { useEffect, useState } from 'react';
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
  const [bizumCopyMessage, setBizumCopyMessage] = useState('');
  const [bankCopyMessage, setBankCopyMessage] = useState('');

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
      setBankCopyMessage('Datos copiados.');
    } catch {
      setBankCopyMessage(value);
    }
  }

  async function copyBizumCode() {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content.bizumCode);
      setBizumCopyMessage('Codigo Bizum copiado.');
    } catch {
      setBizumCopyMessage(content.bizumCode);
    }
  }

  return (
    <>
      <main className="project-page project-page-donations">
        <header className="project-hero">
          <img className="project-logo" src={publicPath('brand/logo-vive-utrera.png')} alt="" aria-hidden="true" />
          <p className="project-wordmark"><span>VIVE</span><strong>UTRERA</strong></p>
          <h1>{content.title}</h1>
          <p>{content.subtitle}</p>
        </header>

        <section className="donation-card">
          <div>
            <h2>{content.introTitle}</h2>
            <p>{content.introText}</p>
          </div>
        </section>

        <section className="donation-card donation-card-stack">
          <div>
            <h2>{content.bizumTitle}</h2>
            <p>{content.bizumText}</p>
            <p className="bizum-code">Codigo Bizum: <strong>{content.bizumCode}</strong></p>
            <Button type="button" className="donation-wide-button" onClick={copyBizumCode}>{content.bizumButtonLabel}</Button>
            {bizumCopyMessage ? <p className="hint" role="status">{bizumCopyMessage}</p> : null}
          </div>
        </section>

        <section className="donation-card donation-card-stack">
          <div>
            <h2>{content.bankTitle}</h2>
            <p>{content.bankText}</p>
            <dl className="bank-details">
              <div><dt>Titular:</dt><dd>{content.bankAccountHolder}</dd></div>
              <div><dt>IBAN:</dt><dd>{content.bankIban}</dd></div>
              <div><dt>Concepto:</dt><dd>{content.bankConcept}</dd></div>
            </dl>
            <Button type="button" variant="secondary" className="donation-wide-button" onClick={copyBankData}>{content.copyButtonLabel}</Button>
            {bankCopyMessage ? <p className="hint" role="status">{bankCopyMessage}</p> : null}
          </div>
        </section>

        <section className="donation-card transparency-card">
          <div>
            <h2>{content.transparencyTitle}</h2>
            <ul>
              {content.transparencyItems.map((item, index) => (
                <li key={`${item}-${index}`}><span>{item}</span></li>
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

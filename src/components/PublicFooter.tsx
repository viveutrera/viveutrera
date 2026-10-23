import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { guideRepository } from '../data/repositories';
import type { ContactContent, SiteContent } from '../domain/types';
import { defaultLanguageCode, getPersistedLanguage } from '../lib/language';
import { publicPath } from '../lib/routing';
import { PwaInstallButton } from './PwaInstallButton';

export function PublicFooter() {
  const language = getPersistedLanguage() ?? defaultLanguageCode;
  const [content, setContent] = useState<SiteContent>();
  const [contact, setContact] = useState<ContactContent>();

  useEffect(() => {
    Promise.all([guideRepository.getSiteContent(language), guideRepository.getContactContent()])
      .then(([siteContent, contactContent]) => { setContent(siteContent); setContact(contactContent); })
      .catch(() => { setContent(undefined); setContact(undefined); });
  }, [language]);

  return (
    <footer className="public-footer" aria-label="Vive Utrera">
      <nav className="public-footer-links" aria-label="Enlaces del sitio">
        <div className="public-footer-links-featured">
          <Link to="/donativos">{content?.footerDonationsLabel ?? 'Donativos'}</Link>
          <Link to="/colaboradores">{content?.footerCollaboratorsLabel ?? 'Colaboradores'}</Link>
        </div>
        <div className="public-footer-links-secondary">
          <Link to="/preview">{content?.footerHomeLabel ?? 'Inicio'}</Link>
          <Link to={`/guia/${language}`}>{content?.footerGuideLabel ?? 'Guía'}</Link>
          <Link to="/admin">{content?.footerAdministrationLabel ?? 'Administración'}</Link>
          <Link to="/host/login">{content?.footerHostsLabel ?? 'Anfitriones'}</Link>
        </div>
      </nav>
      <div className="public-footer-install-section">
        <PwaInstallButton language={language} />
      </div>
      <div className="public-footer-inner">
        <a className="public-footer-brand" href={publicPath('preview')} aria-label="Ir al inicio de la guia">
          <img src={publicPath('brand/logo-monocromo-blanco.png')} alt="" aria-hidden="true" />
          <span className="public-footer-wordmark"><span>VIVE</span><strong>UTRERA</strong></span>
        </a>
        <div className="public-footer-contact">
          {contact?.address ? <span><MapPin size={16} aria-hidden="true" />{contact.address}</span> : null}
          {contact?.phone ? <a href={`tel:${contact.phone}`}><Phone size={16} aria-hidden="true" />{contact.phone}</a> : null}
          {contact?.email ? <a href={`mailto:${contact.email}`}><Mail size={16} aria-hidden="true" />{contact.email}</a> : null}
        </div>
        {contact && (contact.facebookUrl || contact.instagramUrl || contact.xUrl) ? (
          <div className="public-footer-social" aria-label="Redes sociales">
            {contact.facebookUrl ? <a href={contact.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={20} /></a> : null}
            {contact.instagramUrl ? <a href={contact.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={20} /></a> : null}
            {contact.xUrl ? <a href={contact.xUrl} target="_blank" rel="noreferrer" aria-label="X">X</a> : null}
          </div>
        ) : null}
      </div>
    </footer>
  );
}

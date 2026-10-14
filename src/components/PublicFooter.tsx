import { Facebook, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { guideRepository } from '../data/repositories';
import type { SiteContent } from '../domain/types';
import { defaultLanguageCode, getPersistedLanguage } from '../lib/language';
import { publicPath } from '../lib/routing';

export function PublicFooter() {
  const language = getPersistedLanguage() ?? defaultLanguageCode;
  const [content, setContent] = useState<SiteContent>();

  useEffect(() => {
    guideRepository.getSiteContent(language).then(setContent).catch(() => setContent(undefined));
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
      <div className="public-footer-inner">
        <a className="public-footer-brand" href={publicPath('preview')} aria-label="Ir al inicio de la guia">
          <img src={publicPath('brand/logo-monocromo-blanco.png')} alt="" aria-hidden="true" />
          <span className="public-footer-wordmark"><span>VIVE</span><strong>UTRERA</strong></span>
        </a>
        <div className="public-footer-social" aria-label="Redes sociales">
          <span aria-label="Facebook" role="img"><Facebook size={20} /></span>
          <span aria-label="Instagram" role="img"><Instagram size={20} /></span>
          <span aria-label="X" role="img">X</span>
        </div>
      </div>
    </footer>
  );
}

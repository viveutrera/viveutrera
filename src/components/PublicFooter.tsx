import { Facebook, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { defaultLanguageCode, getPersistedLanguage } from '../lib/language';
import { publicPath } from '../lib/routing';

export function PublicFooter() {
  const language = getPersistedLanguage() ?? defaultLanguageCode;
  return (
    <footer className="public-footer" aria-label="Vive Utrera">
      <nav className="public-footer-links" aria-label="Enlaces del sitio">
        <div className="public-footer-links-featured">
          <Link to="/donativos">Donativos</Link>
          <Link to="/colaboradores">Colaboradores</Link>
        </div>
        <div className="public-footer-links-secondary">
          <Link to="/preview">Inicio</Link>
          <Link to={`/guia/${language}`}>Guia</Link>
          <Link to="/admin">Administracion</Link>
          <Link to="/host/login">Anfitriones</Link>
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

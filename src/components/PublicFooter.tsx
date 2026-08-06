import { Facebook, Instagram } from 'lucide-react';
import { publicPath } from '../lib/routing';

export function PublicFooter() {
  return (
    <footer className="public-footer" aria-label="Vive Utrera">
      <div className="public-footer-inner">
        <div className="public-footer-brand">
          <img src={publicPath('brand/logo-monocromo-blanco.png')} alt="" aria-hidden="true" />
          <span>VIVE UTRERA</span>
        </div>
        <div className="public-footer-social" aria-label="Redes sociales">
          <span aria-label="Facebook" role="img"><Facebook size={20} /></span>
          <span aria-label="Instagram" role="img"><Instagram size={20} /></span>
          <span aria-label="X" role="img">X</span>
        </div>
      </div>
    </footer>
  );
}

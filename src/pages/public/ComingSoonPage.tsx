import { publicPath } from '../../lib/routing';

export function ComingSoonPage() {
  return (
    <main className="coming-soon-page" aria-labelledby="coming-soon-title">
      <img className="coming-soon-logo" src={publicPath('brand/logo-cascos.jpg')} alt="Vive Utrera" />
      <h1 id="coming-soon-title">PROXIMAMENTE</h1>
    </main>
  );
}

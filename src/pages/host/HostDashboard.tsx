import { LogOut, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { publicPath } from '../../lib/routing';
import { useAuth } from '../../routes/authContext';

export function HostDashboard() {
  const { signOut, userEmail, userRole } = useAuth();

  return (
    <main className="host-page">
      <header className="host-header">
        <Link to="/preview" className="host-brand" aria-label="Vive Utrera">
          <img src={publicPath('brand/logo-vive-utrera.png')} alt="" />
          <span><strong>VIVE</strong> UTRERA</span>
        </Link>
        <Button type="button" variant="ghost" icon={<LogOut size={18} />} onClick={signOut}>Salir</Button>
      </header>
      <section className="host-hero">
        <p>{userRole === 'admin' ? 'Acceso administrador' : 'Acceso anfitrion'}</p>
        <h1>Mis tours</h1>
        <span>{userEmail}</span>
      </section>
      <section className="host-grid">
        <Card className="host-action-card">
          <Plus size={28} />
          <div>
            <h2>Nuevo tour</h2>
            <p>La creacion de tours, codigos y estados se implementara en la FASE 3 del prompt.</p>
          </div>
          <Button type="button" disabled>Crear tour</Button>
        </Card>
        <Card className="host-action-card">
          <div className="media-admin-icon">Tours</div>
          <div>
            <h2>Tours activos</h2>
            <p>Cuando la FASE 3 este activa, aqui apareceran tus tours y el codigo para compartir con los visitantes.</p>
          </div>
        </Card>
      </section>
    </main>
  );
}

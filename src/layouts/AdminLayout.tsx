import { ExternalLink, Image, LogOut, Settings, Languages, Landmark, Users, LayoutDashboard } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { publicPath } from '../lib/routing';
import { useAuth } from '../routes/authContext';

const links = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard },
  { to: '/admin/configuracion', label: 'Configuracion', icon: Settings },
  { to: '/admin/idiomas', label: 'Idiomas', icon: Languages },
  { to: '/admin/tipos', label: 'Tipos', icon: Landmark },
  { to: '/admin/elementos', label: 'Elementos', icon: Landmark },
  { to: '/admin/multimedia', label: 'Multimedia', icon: Image },
  { to: '/admin/colaboradores', label: 'Colaboradores', icon: Users }
];

export function AdminLayout() {
  const { signOut, userEmail } = useAuth();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <img className="brand-logo" src={publicPath('brand/logo-vive-utrera.png')} alt="Vive Utrera" />
        <div className="admin-sidebar-title" aria-label="Vive Utrera Administracion">
          <strong>VIVE UTRERA</strong>
          <span>ADMINISTRACION</span>
        </div>
        <nav aria-label="Administracion">
          <a href={publicPath('preview')} target="_blank" rel="noreferrer">
            <ExternalLink size={18} />
            <span>Web publica</span>
          </a>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/admin'}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <p>{userEmail ?? 'Administrador'}</p>
          <Button type="button" variant="ghost" icon={<LogOut size={18} />} onClick={signOut}>Salir</Button>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

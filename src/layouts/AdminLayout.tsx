import { LogOut, Settings, Languages, Landmark, Users, LayoutDashboard } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../routes/authContext';

const links = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard },
  { to: '/admin/configuracion', label: 'Configuracion', icon: Settings },
  { to: '/admin/idiomas', label: 'Idiomas', icon: Languages },
  { to: '/admin/tipos', label: 'Tipos', icon: Landmark },
  { to: '/admin/elementos', label: 'Elementos', icon: Landmark },
  { to: '/admin/colaboradores', label: 'Colaboradores', icon: Users }
];

export function AdminLayout() {
  const { signOut, userEmail } = useAuth();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <img src={`${import.meta.env.BASE_URL}brand/logo-horizontal-placeholder.svg`} alt="Vive Utrera" />
        <nav aria-label="Administracion">
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

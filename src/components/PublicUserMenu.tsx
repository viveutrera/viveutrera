import { LayoutDashboard, LogOut, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../routes/authContext';

export function PublicUserMenu() {
  const { isAdmin, isAuthenticated, signOut, userEmail, userRole } = useAuth();
  const [isOpen, setOpen] = useState(false);

  if (!isAuthenticated) return null;

  async function closeSession() {
    setOpen(false);
    await signOut();
  }

  return (
    <div className="public-user-menu">
      <button
        type="button"
        className="public-user-toggle"
        aria-label="Menu de usuario"
        aria-expanded={isOpen}
        onClick={() => setOpen((value) => !value)}
      >
        <UserCircle size={24} />
      </button>
      <div className={isOpen ? 'public-user-dropdown open' : 'public-user-dropdown'} role="menu">
        <strong>{userEmail ?? 'Usuario'}</strong>
        {isAdmin ? (
          <Link to="/admin" role="menuitem" onClick={() => setOpen(false)}>
            <LayoutDashboard size={16} />
            <span>Administracion</span>
          </Link>
        ) : null}
        {userRole === 'host' ? (
          <Link to="/host" role="menuitem" onClick={() => setOpen(false)}>
            <LayoutDashboard size={16} />
            <span>Zona anfitrion</span>
          </Link>
        ) : null}
        <button type="button" onClick={closeSession} role="menuitem">
          <LogOut size={16} />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </div>
  );
}

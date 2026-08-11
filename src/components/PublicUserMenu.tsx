import { LogOut, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../routes/authContext';

export function PublicUserMenu() {
  const { isAuthenticated, signOut, userEmail } = useAuth();
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
        <button type="button" onClick={closeSession} role="menuitem">
          <LogOut size={16} />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import { ActiveTourIndicator } from '../components/ActiveTourIndicator';

export function PublicLayout() {
  return (
    <div className="public-shell">
      <ActiveTourIndicator />
      <Outlet />
    </div>
  );
}

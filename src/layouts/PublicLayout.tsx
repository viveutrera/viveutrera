import { Outlet } from 'react-router-dom';
import { TourNotification } from '../components/TourNotification';

export function PublicLayout() {
  return (
    <div className="public-shell">
      <TourNotification />
      <Outlet />
    </div>
  );
}

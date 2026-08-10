import { Outlet } from 'react-router-dom';
import { ActiveTourIndicator } from '../components/ActiveTourIndicator';
import { TourNotification } from '../components/TourNotification';

export function PublicLayout() {
  return (
    <div className="public-shell">
      <ActiveTourIndicator />
      <TourNotification />
      <Outlet />
    </div>
  );
}

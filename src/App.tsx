import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminElements } from './pages/admin/AdminElements';
import { AdminElementTypes } from './pages/admin/AdminElementTypes';
import { AdminLanguages } from './pages/admin/AdminLanguages';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminPlaceholder } from './pages/admin/AdminPlaceholder';
import { AdminSettings } from './pages/admin/AdminSettings';
import { ElementDetailPage } from './pages/public/ElementDetailPage';
import { GuidePage } from './pages/public/GuidePage';
import { LandingPage } from './pages/public/LandingPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { RequireAuth } from './routes/RequireAuth';

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/guia/:idioma" element={<GuidePage />} />
        <Route path="/guia/:idioma/elemento/:slug" element={<ElementDetailPage />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="configuracion" element={<AdminSettings />} />
        <Route path="idiomas" element={<AdminLanguages />} />
        <Route path="tipos" element={<AdminElementTypes />} />
        <Route path="elementos" element={<AdminElements />} />
        <Route path="colaboradores" element={<AdminPlaceholder title="Colaboradores" />} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

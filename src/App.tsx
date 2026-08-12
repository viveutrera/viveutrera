import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminCollaboratorEdit } from './pages/admin/AdminCollaboratorEdit';
import { AdminCollaboratorPageSettings } from './pages/admin/AdminCollaboratorPageSettings';
import { PublicLayout } from './layouts/PublicLayout';
import { AdminCollaborators } from './pages/admin/AdminCollaborators';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminDonations } from './pages/admin/AdminDonations';
import { AdminElements } from './pages/admin/AdminElements';
import { AdminElementEdit } from './pages/admin/AdminElementEdit';
import { AdminElementTypeEdit } from './pages/admin/AdminElementTypeEdit';
import { AdminElementTypes } from './pages/admin/AdminElementTypes';
import { AdminLanguageEdit } from './pages/admin/AdminLanguageEdit';
import { AdminLanguages } from './pages/admin/AdminLanguages';
import { AdminHosts } from './pages/admin/AdminHosts';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminMedia } from './pages/admin/AdminMedia';
import { AdminSettings } from './pages/admin/AdminSettings';
import { HostDashboard } from './pages/host/HostDashboard';
import { HostLogin } from './pages/host/HostLogin';
import { ComingSoonPage } from './pages/public/ComingSoonPage';
import { CollaboratorsPage } from './pages/public/CollaboratorsPage';
import { DonationPage } from './pages/public/DonationPage';
import { ElementDetailPage } from './pages/public/ElementDetailPage';
import { GuidePage } from './pages/public/GuidePage';
import { LandingPage } from './pages/public/LandingPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { RequireAuth } from './routes/RequireAuth';

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<ComingSoonPage />} />
        <Route path="/preview" element={<LandingPage />} />
        <Route path="/colaboradores" element={<CollaboratorsPage />} />
        <Route path="/donativos" element={<DonationPage />} />
        <Route path="/guia/:idioma" element={<GuidePage />} />
        <Route path="/guia/:idioma/elemento/:slug" element={<ElementDetailPage />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAuth roles={['admin']} loginPath="/admin/login">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="configuracion" replace />} />
        <Route path="panel" element={<AdminDashboard />} />
        <Route path="configuracion" element={<AdminSettings />} />
        <Route path="donativos" element={<AdminDonations />} />
        <Route path="idiomas" element={<AdminLanguages />} />
        <Route path="idiomas/:id" element={<AdminLanguageEdit />} />
        <Route path="tipos" element={<AdminElementTypes />} />
        <Route path="tipos/:id" element={<AdminElementTypeEdit />} />
        <Route path="elementos" element={<AdminElements />} />
        <Route path="elementos/:id" element={<AdminElementEdit />} />
        <Route path="multimedia" element={<AdminMedia />} />
        <Route path="colaboradores" element={<AdminCollaborators />} />
        <Route path="colaboradores-pagina" element={<AdminCollaboratorPageSettings />} />
        <Route path="colaboradores/:id" element={<AdminCollaboratorEdit />} />
        <Route path="anfitriones" element={<AdminHosts />} />
      </Route>
      <Route path="/host/login" element={<HostLogin />} />
      <Route
        path="/host"
        element={
          <RequireAuth roles={['host', 'admin']} loginPath="/host/login">
            <HostDashboard />
          </RequireAuth>
        }
      />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

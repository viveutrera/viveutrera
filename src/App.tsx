import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminCollaboratorEdit } from './pages/admin/AdminCollaboratorEdit';
import { PublicLayout } from './layouts/PublicLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminCollaborators } from './pages/admin/AdminCollaborators';
import { AdminElements } from './pages/admin/AdminElements';
import { AdminElementEdit } from './pages/admin/AdminElementEdit';
import { AdminElementTypeEdit } from './pages/admin/AdminElementTypeEdit';
import { AdminElementTypes } from './pages/admin/AdminElementTypes';
import { AdminLanguageEdit } from './pages/admin/AdminLanguageEdit';
import { AdminLanguages } from './pages/admin/AdminLanguages';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminMedia } from './pages/admin/AdminMedia';
import { AdminSettings } from './pages/admin/AdminSettings';
import { ComingSoonPage } from './pages/public/ComingSoonPage';
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
        <Route path="idiomas/:id" element={<AdminLanguageEdit />} />
        <Route path="tipos" element={<AdminElementTypes />} />
        <Route path="tipos/:id" element={<AdminElementTypeEdit />} />
        <Route path="elementos" element={<AdminElements />} />
        <Route path="elementos/:id" element={<AdminElementEdit />} />
        <Route path="multimedia" element={<AdminMedia />} />
        <Route path="colaboradores" element={<AdminCollaborators />} />
        <Route path="colaboradores/:id" element={<AdminCollaboratorEdit />} />
      </Route>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

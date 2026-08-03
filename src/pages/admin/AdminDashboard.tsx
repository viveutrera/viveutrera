import { Card } from '../../components/ui/Card';
import { mockStorageService } from '../../data/repositories';

export function AdminDashboard() {
  return (
    <section className="admin-section">
      <h1>Panel principal</h1>
      <div className="admin-grid">
        <Card>
          <h2>Contenido</h2>
          <p>Hero, ciudad, idiomas, tipos, elementos y colaboradores quedan separados para conectar Supabase.</p>
        </Card>
        <Card>
          <h2>Archivos</h2>
          <p>Servicio de almacenamiento desacoplado preparado para Worker + R2.</p>
          <code>{mockStorageService.getPublicUrl('site/hero/placeholder.webp')}</code>
        </Card>
        <Card>
          <h2>Seguridad</h2>
          <p>La ruta admin exige sesion y las migraciones preparan RLS para reforzar permisos en base de datos.</p>
        </Card>
      </div>
    </section>
  );
}

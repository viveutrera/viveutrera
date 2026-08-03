import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <section className="admin-section">
      <div className="admin-title-row">
        <h1>{title}</h1>
        <Button type="button">Nuevo</Button>
      </div>
      <Card>
        <h2>Maqueta funcional</h2>
        <p>Esta seccion deja preparados buscador, estados, modales y formularios para conectar los repositorios de Supabase en la siguiente fase.</p>
      </Card>
    </section>
  );
}

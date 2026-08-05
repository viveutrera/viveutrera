import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/States';

export function NotFoundPage() {
  return (
    <main className="section">
      <EmptyState title="Pagina no encontrada" message="La ruta solicitada no existe en Vive Utrera." />
      <ButtonLink to="/preview">Volver al inicio</ButtonLink>
    </main>
  );
}

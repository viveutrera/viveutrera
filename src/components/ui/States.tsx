export function LoadingState({ label = 'Cargando' }: { label?: string }) {
  return <div className="state state-loading" role="status">{label}...</div>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="state">
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ title = 'No se pudo cargar', message }: { title?: string; message: string }) {
  return (
    <div className="state state-error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}

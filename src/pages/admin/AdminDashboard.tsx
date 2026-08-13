import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';

interface MediaAssetRow {
  file_size?: number | null;
  media_type?: string;
  media_variants?: Array<{ file_size?: number | null }> | null;
}

interface UsageSummary {
  languages: number;
  elementTypes: number;
  elements: number;
  elementImages: number;
  elementAudios: number;
  elementLinks: number;
  collaborators: number;
  mediaAssets: number;
  imageAssets: number;
  audioAssets: number;
  registeredBytes: number;
}

export function AdminDashboard() {
  const [summary, setSummary] = useState<UsageSummary>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    Promise.all([
      adminRepository.listLanguages(),
      adminRepository.listElementTypes(),
      adminRepository.listElements(),
      adminRepository.listElementImages(),
      adminRepository.listElementAudios(),
      adminRepository.listLinks(),
      adminRepository.listCollaborators(),
      adminRepository.listMediaAssets()
    ]).then(([languages, types, elements, images, audios, links, collaborators, mediaAssets]) => {
      const languageRows = languages as unknown[];
      const typeRows = types as unknown[];
      const elementRows = elements as unknown[];
      const imageRows = images as unknown[];
      const audioRows = audios as unknown[];
      const linkRows = links as unknown[];
      const collaboratorRows = collaborators as unknown[];
      const assets = mediaAssets as unknown as MediaAssetRow[];
      setSummary({
        languages: languageRows.length,
        elementTypes: typeRows.length,
        elements: elementRows.length,
        elementImages: imageRows.length,
        elementAudios: audioRows.length,
        elementLinks: linkRows.length,
        collaborators: collaboratorRows.length,
        mediaAssets: assets.length,
        imageAssets: assets.filter((asset) => asset.media_type === 'image' || asset.media_type === 'logo').length,
        audioAssets: assets.filter((asset) => asset.media_type === 'audio').length,
        registeredBytes: assets.reduce((total, asset) => (
          total + (asset.file_size ?? 0) + (asset.media_variants ?? []).reduce((variantTotal, variant) => variantTotal + (variant.file_size ?? 0), 0)
        ), 0)
      });
    }).catch(() => {
      setError('No se pudo cargar el resumen de uso.');
    }).finally(() => setLoading(false));
  }, []);

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para ver el resumen real del proyecto." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Panel principal</h1>
      {error ? <ErrorState message={error} /> : null}
      {summary ? (
        <>
          <div className="admin-grid admin-metric-grid">
            <MetricCard title="Elementos creados" value={summary.elements} detail="Elementos dados de alta en la guia" />
            <MetricCard title="Contenido" value={summary.elementTypes} detail={`${summary.languages} idiomas configurados`} />
            <MetricCard title="Multimedia" value={summary.mediaAssets} detail={`${summary.imageAssets} imagenes/logos - ${summary.audioAssets} audios`} />
            <MetricCard title="R2 estimado" value={formatBytes(summary.registeredBytes)} detail={`${summary.elementImages} imagenes - ${summary.elementAudios} audios asociados`} />
            <MetricCard title="Colaboradores" value={summary.collaborators} detail={`${summary.elementLinks} enlaces de elementos`} />
          </div>

          <Card>
            <h2>Uso sensible para planes free</h2>
            <div className="usage-table" role="table" aria-label="Uso sensible para planes free">
              <div role="row">
                <strong role="columnheader">Servicio</strong>
                <strong role="columnheader">Dato a vigilar</strong>
                <strong role="columnheader">Limite free / riesgo</strong>
                <strong role="columnheader">Estado en la app</strong>
              </div>
              <div role="row">
                <span role="cell">Cloudflare R2</span>
                <span role="cell">Almacenamiento</span>
                <span role="cell">10 GB-mes incluidos en Standard</span>
                <span role="cell">{formatBytes(summary.registeredBytes)} registrados por la app</span>
              </div>
              <div role="row">
                <span role="cell">Cloudflare R2</span>
                <span role="cell">Operaciones Class A</span>
                <span role="cell">1 millon/mes incluido; subidas/listados consumen este bloque</span>
                <span role="cell">Consultar en Cloudflare R2 Metrics</span>
              </div>
              <div role="row">
                <span role="cell">Cloudflare R2</span>
                <span role="cell">Operaciones Class B</span>
                <span role="cell">10 millones/mes incluidas; lecturas de objetos consumen este bloque</span>
                <span role="cell">Consultar en Cloudflare R2 Metrics</span>
              </div>
              <div role="row">
                <span role="cell">Supabase</span>
                <span role="cell">Base de datos</span>
                <span role="cell">500 MB incluidos en Free</span>
                <span role="cell">Contenido: {summary.elements} elementos, {summary.collaborators} colaboradores</span>
              </div>
              <div role="row">
                <span role="cell">Supabase</span>
                <span role="cell">Egress / transferencia</span>
                <span role="cell">5 GB egress + 5 GB cached egress en Free</span>
                <span role="cell">Consultar en Supabase Usage</span>
              </div>
            </div>
            <p className="hint">Las operaciones reales de R2 y el egress real de Supabase no deben consultarse desde el frontend porque requeririan credenciales privadas. Este panel muestra el inventario interno y te indica los contadores externos que afectan a coste.</p>
          </Card>
        </>
      ) : null}
    </section>
  );
}

function MetricCard({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className="metric-value">{value}</p>
      <p>{detail}</p>
    </Card>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

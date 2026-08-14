import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { LanguageLegend } from '../../components/admin/LanguageLegend';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { mediaUrl } from '../../lib/media';
import { matchesSearch, slugify, validateRequired, validateSlug } from '../../lib/validation';

interface LanguageRow {
  id: string;
  code: string;
  native_name: string;
  sort_order: number;
}

interface MediaAssetRow {
  id: string;
  object_key: string;
  media_type: 'image' | 'audio' | 'logo' | 'file';
  original_name: string;
}

interface ElementRow {
  id: string;
  slug: string;
  element_translations?: Array<{ name: string; languages?: { code: string } | { code: string }[] | null }>;
}

interface RouteElementRow {
  id?: string;
  element_id: string;
  sort_order: number;
  elements?: {
    slug: string;
    element_translations?: Array<{ name: string; languages?: { code: string } | { code: string }[] | null }>;
  } | {
    slug: string;
    element_translations?: Array<{ name: string; languages?: { code: string } | { code: string }[] | null }>;
  }[] | null;
}

interface RouteRow {
  id?: string;
  slug: string;
  media_asset_id?: string | null;
  is_active: boolean;
  sort_order: number;
  media_assets?: MediaAssetRow | MediaAssetRow[] | null;
  route_translations?: Array<{
    id?: string;
    language_id?: string;
    name: string;
    description?: string | null;
    seo_title?: string | null;
    seo_description?: string | null;
    languages?: { code: string } | { code: string }[] | null;
  }>;
  route_elements?: RouteElementRow[];
}

interface TranslationForm {
  language_id: string;
  name: string;
  description: string;
  seo_title: string;
  seo_description: string;
}

interface RouteForm {
  id?: string;
  slug: string;
  media_asset_id: string;
  is_active: boolean;
  sort_order: number;
  translations: TranslationForm[];
  elements: Array<{ element_id: string; sort_order: number }>;
}

const emptyRoute = (languages: LanguageRow[]): RouteForm => ({
  slug: '',
  media_asset_id: '',
  is_active: true,
  sort_order: 0,
  translations: languages.map((language) => ({
    language_id: language.id,
    name: '',
    description: '',
    seo_title: '',
    seo_description: ''
  })),
  elements: []
});

export function AdminRoutes() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [elements, setElements] = useState<ElementRow[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRow[]>([]);
  const [form, setForm] = useState<RouteForm>(emptyRoute([]));
  const [selectedElementId, setSelectedElementId] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string>();
  const [search, setSearch] = useState('');
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [routeRows, languageRows, elementRows, mediaRows] = await Promise.all([
      adminRepository.listRoutes(),
      adminRepository.listLanguages(),
      adminRepository.listElements(),
      adminRepository.listMediaAssets()
    ]);
    const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((left, right) => left.sort_order - right.sort_order);
    setRoutes(routeRows as unknown as RouteRow[]);
    setLanguages(nextLanguages);
    setElements(elementRows as unknown as ElementRow[]);
    setMediaAssets((mediaRows as unknown as MediaAssetRow[]).filter((asset) => asset.media_type === 'image' || asset.media_type === 'logo'));
    setForm((current) => current.translations.length ? current : emptyRoute(nextLanguages));
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar las rutas.');
      setLoading(false);
    });
  }, []);

  const filteredRoutes = useMemo(() => routes.filter((route) => matchesSearch([
    route.slug,
    route.route_translations?.map((translation) => `${translation.name} ${translation.description ?? ''}`).join(' ')
  ], search)), [routes, search]);

  function openCreate() {
    setForm(emptyRoute(languages));
    setSelectedElementId('');
    setError('');
    setModalOpen(true);
  }

  function openEdit(route: RouteRow) {
    setForm({
      id: route.id,
      slug: route.slug,
      media_asset_id: route.media_asset_id ?? mediaAsset(route.media_assets)?.id ?? '',
      is_active: route.is_active,
      sort_order: route.sort_order,
      translations: languages.map((language) => {
        const translation = route.route_translations?.find((item) => item.language_id === language.id || getCode(item.languages) === language.code);
        return {
          language_id: language.id,
          name: translation?.name ?? '',
          description: translation?.description ?? '',
          seo_title: translation?.seo_title ?? '',
          seo_description: translation?.seo_description ?? ''
        };
      }),
      elements: (route.route_elements ?? [])
        .slice()
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((item, index) => ({ element_id: item.element_id, sort_order: item.sort_order ?? index }))
    });
    setSelectedElementId('');
    setError('');
    setModalOpen(true);
  }

  function resetModal() {
    setModalOpen(false);
    setForm(emptyRoute(languages));
    setSelectedElementId('');
    setError('');
  }

  function updateTranslation(languageId: string, field: keyof Omit<TranslationForm, 'language_id'>, value: string) {
    setForm((current) => ({
      ...current,
      translations: current.translations.map((translation) => (
        translation.language_id === languageId ? { ...translation, [field]: value } : translation
      ))
    }));
  }

  function addElementToRoute() {
    if (!selectedElementId || form.elements.some((item) => item.element_id === selectedElementId)) return;
    setForm((current) => ({
      ...current,
      elements: [...current.elements, { element_id: selectedElementId, sort_order: current.elements.length }]
    }));
    setSelectedElementId('');
  }

  function removeElementFromRoute(elementId: string) {
    setForm((current) => ({
      ...current,
      elements: current.elements.filter((item) => item.element_id !== elementId)
    }));
  }

  function updateElementOrder(elementId: string, sortOrder: number) {
    setForm((current) => ({
      ...current,
      elements: current.elements.map((item) => item.element_id === elementId ? { ...item, sort_order: sortOrder } : item)
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const candidate = {
      ...form,
      slug: form.id ? form.slug : uniqueSlug(slugify(primaryTranslationName(form, languages), 'ruta'), routes)
    };
    const validationError = validateRoute(candidate, languages, routes);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveRoute({
        ...candidate,
        slug: candidate.slug.trim(),
        media_asset_id: candidate.media_asset_id || null,
        translations: candidate.translations,
        elements: candidate.elements
          .slice()
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((item, index) => ({ element_id: item.element_id, sort_order: index }))
      });
      resetModal();
      setSuccess('Ruta guardada.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la ruta.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminRepository.deleteRoute(deleteId);
      setDeleteId(undefined);
      setSuccess('Ruta borrada.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar la ruta.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedRoute = routes.find((route) => route.id === deleteId);
  const selectedAsset = mediaAssets.find((asset) => asset.id === form.media_asset_id);

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar rutas reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Rutas</h1>
      {error && !isModalOpen ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <div className="admin-tools">
        <label className="search-box">
          <span className="sr-only">Buscar rutas</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o descripcion" />
        </label>
        <Button type="button" icon={<Plus size={18} />} onClick={openCreate}>Crear ruta</Button>
      </div>
      <div className="admin-data-table admin-data-table-routes" role="table" aria-label="Rutas">
        <div className="admin-data-row admin-data-head" role="row">
          <span role="columnheader">Nombre</span>
          <span role="columnheader">Slug</span>
          <span role="columnheader">Elementos</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader">Orden</span>
          <span role="columnheader" aria-label="Acciones" />
        </div>
        {filteredRoutes.map((route) => (
          <div className="admin-data-row" role="row" key={route.id}>
            <span role="cell"><strong>{routeName(route)}</strong><small>{routeDescription(route)}</small></span>
            <span role="cell">{route.slug}</span>
            <span role="cell">{route.route_elements?.length ?? 0}</span>
            <span role="cell">{route.is_active ? 'Activa' : 'Oculta'}</span>
            <span role="cell">{route.sort_order}</span>
            <span className="row-actions" role="cell">
              <button className="icon-button" type="button" aria-label={`Editar ${route.slug}`} onClick={() => openEdit(route)}><Edit2 size={18} /></button>
              <button className="icon-button icon-button-danger" type="button" aria-label={`Borrar ${route.slug}`} onClick={() => setDeleteId(route.id)}><Trash2 size={18} /></button>
            </span>
          </div>
        ))}
      </div>

      <Modal title={form.id ? 'Editar ruta' : 'Crear ruta'} isOpen={isModalOpen} onClose={resetModal}>
        <form className="stack-form modal-form admin-route-form" onSubmit={submit}>
          {error ? <ErrorState message={error} /> : null}
          <div className="admin-form">
            <SelectField label="Imagen" value={form.media_asset_id} onChange={(event) => setForm({ ...form, media_asset_id: event.target.value })}>
              <option value="">Sin imagen</option>
              {mediaAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_name}</option>)}
            </SelectField>
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
            <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Ruta activa</label>
          </div>
          {selectedAsset ? <img className="route-admin-preview" src={mediaUrl(selectedAsset.object_key)} alt="" /> : null}

          <div className="translation-grid">
            {languages.map((language) => {
              const translation = form.translations.find((item) => item.language_id === language.id) ?? emptyRoute([language]).translations[0];
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend><LanguageLegend code={language.code} name={language.native_name} /></legend>
                  <FormField label="Nombre" value={translation.name} onChange={(event) => updateTranslation(language.id, 'name', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Descripcion" value={translation.description} onChange={(event) => updateTranslation(language.id, 'description', event.target.value)} required={language.code === 'es'} />
                  <FormField label="SEO titulo" value={translation.seo_title} onChange={(event) => updateTranslation(language.id, 'seo_title', event.target.value)} />
                  <TextAreaField label="SEO descripcion" value={translation.seo_description} onChange={(event) => updateTranslation(language.id, 'seo_description', event.target.value)} />
                </fieldset>
              );
            })}
          </div>

          <section className="route-elements-editor">
            <h2>Elementos de la ruta</h2>
            <div className="route-element-picker">
              <SelectField label="Añadir elemento" value={selectedElementId} onChange={(event) => setSelectedElementId(event.target.value)}>
                <option value="">Selecciona un elemento</option>
                {elements
                  .filter((element) => !form.elements.some((item) => item.element_id === element.id))
                  .map((element) => <option key={element.id} value={element.id}>{elementName(element)}</option>)}
              </SelectField>
              <Button type="button" variant="secondary" onClick={addElementToRoute} disabled={!selectedElementId}>Añadir</Button>
            </div>
            <div className="admin-data-table admin-data-table-route-elements" role="table" aria-label="Elementos de la ruta">
              <div className="admin-data-row admin-data-head" role="row">
                <span role="columnheader">Elemento</span>
                <span role="columnheader">Orden</span>
                <span role="columnheader" aria-label="Acciones" />
              </div>
              {form.elements.slice().sort((left, right) => left.sort_order - right.sort_order).map((item) => (
                <div className="admin-data-row" role="row" key={item.element_id}>
                  <span role="cell">{elementName(elements.find((element) => element.id === item.element_id))}</span>
                  <span role="cell">
                    <input className="admin-inline-number" type="number" value={item.sort_order} onChange={(event) => updateElementOrder(item.element_id, Number(event.target.value))} aria-label="Orden del elemento" />
                  </span>
                  <span className="row-actions" role="cell">
                    <button className="icon-button icon-button-danger" type="button" aria-label="Quitar elemento" onClick={() => removeElementFromRoute(item.element_id)}><Trash2 size={18} /></button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={resetModal} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar ruta'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Borrar ruta"
        message={`Se eliminara ${selectedRoute?.slug ?? 'esta ruta'} y su lista de elementos. Los elementos no se borraran.`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteId(undefined)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function validateRoute(candidate: RouteForm, languages: LanguageRow[], rows: RouteRow[]) {
  const slugError = validateSlug(candidate.slug);
  if (slugError) return slugError;
  const duplicated = rows.some((item) => item.id !== candidate.id && item.slug === candidate.slug.trim());
  if (duplicated) return 'Ya existe una ruta con ese slug.';
  const spanish = languages.find((language) => language.code === 'es') ?? languages[0];
  const spanishTranslation = candidate.translations.find((translation) => translation.language_id === spanish?.id);
  return [
    validateRequired(spanishTranslation?.name, `Nombre en ${spanish?.native_name ?? 'el idioma principal'}`),
    validateRequired(spanishTranslation?.description, `Descripcion en ${spanish?.native_name ?? 'el idioma principal'}`)
  ].find(Boolean) ?? '';
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}

function mediaAsset(relation: MediaAssetRow | MediaAssetRow[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function routeName(route: RouteRow) {
  return route.route_translations?.find((translation) => getCode(translation.languages) === 'es')?.name ?? route.route_translations?.[0]?.name ?? route.slug;
}

function routeDescription(route: RouteRow) {
  return route.route_translations?.find((translation) => getCode(translation.languages) === 'es')?.description ?? route.route_translations?.[0]?.description ?? '';
}

function elementName(element?: ElementRow | RouteElementRow['elements']) {
  const row = Array.isArray(element) ? element[0] : element;
  return row?.element_translations?.find((translation) => getCode(translation.languages) === 'es')?.name ?? row?.slug ?? 'Elemento';
}

function primaryTranslationName(form: RouteForm, languages: LanguageRow[]) {
  const primary = languages.find((language) => language.code === 'es') ?? languages[0];
  return form.translations.find((translation) => translation.language_id === primary?.id)?.name ?? '';
}

function uniqueSlug(base: string, rows: RouteRow[]) {
  const used = new Set(rows.map((row) => row.slug));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

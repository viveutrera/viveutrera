import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField, SelectField, TextAreaField } from '../../components/ui/FormField';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { adminRepository, canUseSupabase } from '../../data/supabaseRepository';
import { canUseUploadApi, deleteMediaFiles } from '../../lib/uploadApi';
import { matchesSearch, slugify, validateOptionalUrl, validateRequired, validateSlug } from '../../lib/validation';

interface LanguageRow {
  id: string;
  code: string;
  native_name: string;
  sort_order: number;
}

interface TypeRow {
  id: string;
  slug: string;
  element_type_translations?: Array<{ name: string; languages?: { code: string } | { code: string }[] | null }>;
}

interface ElementTranslationRow {
  name: string;
  short_text: string;
  long_text?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_published: boolean;
  language_id?: string;
  languages?: { code: string } | { code: string }[] | null;
}

interface ElementRow {
  id?: string;
  slug: string;
  element_type_id: string;
  maps_url?: string | null;
  status: 'draft' | 'published';
  is_featured: boolean;
  show_long_text_default?: boolean;
  sort_order: number;
  element_translations?: ElementTranslationRow[];
}

interface MediaAssetRow {
  id: string;
  object_key: string;
  media_variants?: Array<{ object_key: string }> | null;
}

interface ElementImageRow {
  id?: string;
  element_id: string;
  media_assets?: MediaAssetRow | MediaAssetRow[] | null;
}

interface ElementAudioRow {
  id?: string;
  element_id: string;
  media_assets?: MediaAssetRow | MediaAssetRow[] | null;
}

interface ElementLinkRow {
  id?: string;
  element_id: string;
}

interface TranslationForm {
  language_id: string;
  name: string;
  short_text: string;
  long_text: string;
  seo_title: string;
  seo_description: string;
  is_published: boolean;
}

interface ElementForm {
  slug: string;
  element_type_id: string;
  maps_url: string;
  status: 'draft' | 'published';
  is_featured: boolean;
  show_long_text_default: boolean;
  sort_order: number;
  translations: TranslationForm[];
}

const emptyElement = (languages: LanguageRow[]): ElementForm => ({
  slug: '',
  element_type_id: '',
  maps_url: '',
  status: 'draft',
  is_featured: false,
  show_long_text_default: false,
  sort_order: 0,
  translations: languages.map((language) => ({
    language_id: language.id,
    name: '',
    short_text: '',
    long_text: '',
    seo_title: '',
    seo_description: '',
    is_published: language.code === 'es'
  }))
});

export function AdminElements() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ElementRow[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [form, setForm] = useState<ElementForm>(emptyElement([]));
  const [deleteId, setDeleteId] = useState<string>();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!canUseSupabase()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [elementRows, typeRows, languageRows] = await Promise.all([
      adminRepository.listElements(),
      adminRepository.listElementTypes(),
      adminRepository.listLanguages()
    ]);
    const nextLanguages = (languageRows as unknown as LanguageRow[]).sort((a, b) => a.sort_order - b.sort_order);
    setItems(elementRows as unknown as ElementRow[]);
    setTypes(typeRows as unknown as TypeRow[]);
    setLanguages(nextLanguages);
    setForm((current) => current.translations.length ? current : emptyElement(nextLanguages));
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setError('No se pudieron cargar los elementos.');
      setLoading(false);
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const candidate = {
      ...form,
      slug: uniqueSlug(slugify(primaryTranslationName(form, languages), 'elemento'), items)
    };
    const validationError = validateElement(candidate, languages, items);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await adminRepository.saveElement({ ...candidate, slug: candidate.slug.trim(), maps_url: candidate.maps_url.trim() });
      resetForm();
      setCreateOpen(false);
      setSuccess('Elemento guardado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar el elemento.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(emptyElement(languages));
    setCreateOpen(false);
    setError('');
  }

  function updateTranslation(languageId: string, field: keyof Omit<TranslationForm, 'language_id'>, value: string | boolean) {
    setForm((current) => ({
      ...current,
      translations: current.translations.map((translation) => (
        translation.language_id === languageId ? { ...translation, [field]: value } : translation
      ))
    }));
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await deleteElementWithAssociations(deleteId);
      setDeleteId(undefined);
      setSuccess('Elemento borrado.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo borrar el elemento.');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteElementWithAssociations(elementId: string) {
    const [imageRows, audioRows, linkRows] = await Promise.all([
      adminRepository.listElementImages(),
      adminRepository.listElementAudios(),
      adminRepository.listLinks()
    ]);
    const elementImages = (imageRows as unknown as ElementImageRow[]).filter((item) => item.element_id === elementId);
    const elementAudios = (audioRows as unknown as ElementAudioRow[]).filter((item) => item.element_id === elementId);
    const elementLinks = (linkRows as unknown as ElementLinkRow[]).filter((item) => item.element_id === elementId);

    for (const link of elementLinks) {
      if (link.id) await adminRepository.deleteLink(link.id);
    }
    for (const image of elementImages) {
      const asset = mediaAsset(image.media_assets);
      if (image.id) await adminRepository.deleteElementImage(image.id);
      if (asset?.id) await deleteUnusedMediaAsset(asset);
    }
    for (const audio of elementAudios) {
      const asset = mediaAsset(audio.media_assets);
      if (audio.id) await adminRepository.deleteElementAudio(audio.id);
      if (asset?.id) await deleteUnusedMediaAsset(asset);
    }
    await adminRepository.deleteElement(elementId);
  }

  async function deleteUnusedMediaAsset(asset: MediaAssetRow) {
    if (!asset.id || !canUseUploadApi()) return;
    const usage = await adminRepository.getMediaAssetUsage(asset.id);
    const totalUsage = usage.images + usage.audios + usage.collaborators + usage.siteSettings;
    if (totalUsage > 0) return;
    const objectKeys = [asset.object_key, ...(asset.media_variants ?? []).map((variant) => variant.object_key)];
    await deleteMediaFiles(objectKeys);
    await adminRepository.deleteMediaAsset(asset.id);
  }

  const filteredItems = items.filter((item) => {
    const textValues = [
      item.slug,
      item.status,
      item.element_translations?.map((translation) => `${translation.name} ${translation.short_text}`).join(' ')
    ];
    return matchesSearch(textValues, search)
      && (statusFilter === 'all' || item.status === statusFilter)
      && (typeFilter === 'all' || item.element_type_id === typeFilter)
      && (languageFilter === 'all' || item.element_translations?.some((translation) => translation.language_id === languageFilter && translation.is_published));
  });
  const selectedElement = items.find((item) => item.id === deleteId);

  if (!canUseSupabase()) return <EmptyState title="Supabase no configurado" message="Configura las variables remotas para editar elementos reales." />;
  if (isLoading) return <LoadingState />;

  return (
    <section className="admin-section">
      <h1>Elementos</h1>
      {error ? <ErrorState message={error} /> : null}
      {success ? <div className="state state-success" role="status">{success}</div> : null}
      <div className="admin-tools">
        <label className="search-box">
          <span className="sr-only">Buscar elementos</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, slug o texto" />
        </label>
        <select className="admin-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar elementos por estado">
          <option value="all">Todos los estados</option>
          <option value="draft">Borradores</option>
          <option value="published">Publicados</option>
        </select>
        <select className="admin-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrar elementos por tipo">
          <option value="all">Todos los tipos</option>
          {types.map((type) => <option key={type.id} value={type.id}>{typeName(type)}</option>)}
        </select>
        <select className="admin-filter" value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)} aria-label="Filtrar elementos por idioma publicado">
          <option value="all">Todos los idiomas</option>
          {languages.map((language) => <option key={language.id} value={language.id}>{language.native_name}</option>)}
        </select>
        <Button type="button" icon={<Plus size={18} />} onClick={() => setCreateOpen(true)}>Crear elemento</Button>
      </div>
      <div className="admin-data-table" role="table" aria-label="Elementos">
        <div className="admin-data-row admin-data-head" role="row">
          <span role="columnheader">Nombre</span>
          <span role="columnheader">Slug</span>
          <span role="columnheader">Tipo</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader">Orden</span>
          <span role="columnheader" aria-label="Acciones" />
        </div>
        {filteredItems.map((item) => (
          <div
            className="admin-data-row admin-data-row-clickable"
            role="row"
            tabIndex={0}
            key={item.id}
            onClick={() => navigate(`/admin/elementos/${item.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(`/admin/elementos/${item.id}`);
              }
            }}
          >
            <span role="cell"><strong>{elementName(item)}</strong><small>{item.is_featured ? 'Destacado' : 'Normal'}</small></span>
            <span role="cell">{item.slug}</span>
            <span role="cell">{typeName(types.find((type) => type.id === item.element_type_id))}</span>
            <span role="cell">{item.status === 'published' ? 'Publicado' : 'Borrador'}</span>
            <span role="cell">{item.sort_order}</span>
            <span className="row-actions" role="cell">
              <button className="icon-button icon-button-danger" type="button" aria-label={`Borrar ${item.slug}`} onClick={(event) => {
                event.stopPropagation();
                setDeleteId(item.id);
              }}><Trash2 size={18} /></button>
            </span>
          </div>
        ))}
      </div>
      <Modal title="Crear elemento" isOpen={isCreateOpen} onClose={resetForm}>
        <form className="stack-form modal-form" onSubmit={submit}>
          <div className="admin-form">
            <SelectField label="Tipo" value={form.element_type_id} onChange={(event) => setForm({ ...form, element_type_id: event.target.value })} required>
              <option value="">Selecciona un tipo</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>{typeName(type)}</option>
              ))}
            </SelectField>
            <SelectField label="Estado" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'draft' | 'published' })}>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </SelectField>
            <FormField label="URL mapa" value={form.maps_url} onChange={(event) => setForm({ ...form, maps_url: event.target.value })} />
            <FormField label="Orden" type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} />
            <label className="check-field"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /> Destacado</label>
            <label className="check-field"><input type="checkbox" checked={form.show_long_text_default} onChange={(event) => setForm({ ...form, show_long_text_default: event.target.checked })} /> Texto largo desplegado por defecto</label>
          </div>
          <div className="translation-grid">
            {languages.map((language) => {
              const translation = form.translations.find((item) => item.language_id === language.id) ?? emptyElement([language]).translations[0];
              return (
                <fieldset className="translation-panel" key={language.id}>
                  <legend>{language.native_name}</legend>
                  <FormField label="Nombre" value={translation.name} onChange={(event) => updateTranslation(language.id, 'name', event.target.value)} required={language.code === 'es'} />
                  <TextAreaField label="Texto corto" value={translation.short_text} onChange={(event) => updateTranslation(language.id, 'short_text', event.target.value)} required={language.code === 'es'} />
                </fieldset>
              );
            })}
          </div>
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Borrar elemento"
        message={`Se eliminara ${selectedElement?.slug ?? 'este elemento'} con sus traducciones, enlaces y asociaciones textuales.`}
        confirmLabel="Borrar"
        onCancel={() => setDeleteId(undefined)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function validateElement(candidate: ElementForm, languages: LanguageRow[], rows: ElementRow[], editingId?: string) {
  const slugError = validateSlug(candidate.slug);
  if (slugError) return slugError;
  const duplicated = rows.some((item) => item.id !== editingId && item.slug === candidate.slug.trim());
  if (duplicated) return 'Ya existe un elemento con ese slug.';
  const typeError = validateRequired(candidate.element_type_id, 'Tipo');
  if (typeError) return typeError;
  const urlError = validateOptionalUrl(candidate.maps_url, 'La URL del mapa');
  if (urlError) return urlError;
  const spanish = languages.find((language) => language.code === 'es') ?? languages[0];
  const spanishTranslation = candidate.translations.find((translation) => translation.language_id === spanish?.id);
  const requiredError = [
    validateRequired(spanishTranslation?.name, `Nombre en ${spanish?.native_name ?? 'el idioma principal'}`),
    validateRequired(spanishTranslation?.short_text, `Texto corto en ${spanish?.native_name ?? 'el idioma principal'}`)
  ].find(Boolean);
  return requiredError ?? '';
}

function getCode(relation: { code: string } | { code: string }[] | null | undefined) {
  return Array.isArray(relation) ? relation[0]?.code : relation?.code;
}

function typeName(type?: TypeRow) {
  return type?.element_type_translations?.find((translation) => getCode(translation.languages) === 'es')?.name ?? type?.slug ?? 'Sin tipo';
}

function mediaAsset(relation: MediaAssetRow | MediaAssetRow[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function elementName(element: ElementRow) {
  return element.element_translations?.find((translation) => getCode(translation.languages) === 'es')?.name ?? element.slug;
}

function primaryTranslationName(form: ElementForm, languages: LanguageRow[]) {
  const primary = languages.find((language) => language.code === 'es') ?? languages[0];
  return form.translations.find((translation) => translation.language_id === primary?.id)?.name ?? '';
}

function uniqueSlug(base: string, rows: ElementRow[]) {
  const used = new Set(rows.map((row) => row.slug));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

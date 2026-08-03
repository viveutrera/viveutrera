# Vive Utrera

Guia audiovisual publica de Utrera, mobile-first y preparada para publicarse como sitio estatico en GitHub Pages.

## Estado

Fases implementadas:

- Vite, React, TypeScript y React Router.
- Rutas publicas: `/`, `/guia/:idioma`, `/guia/:idioma/elemento/:slug`.
- Rutas admin: `/admin/login`, `/admin`, `/admin/configuracion`, `/admin/idiomas`, `/admin/tipos`, `/admin/elementos`, `/admin/colaboradores`.
- Identidad visual base con variables CSS de Vive Utrera.
- Componentes reutilizables de botones, tarjetas, formularios, modales, confirmacion y estados.
- Datos simulados tipados y repositorios desacoplados.
- Cliente Supabase preparado por variables de entorno.
- Contrato de almacenamiento y cliente simulado para sustituir por Cloudflare Worker + R2.
- Migracion SQL inicial con tablas, indices y RLS.
- Workflow de GitHub Pages.
- Repositorios publicos con Supabase real y fallback a mocks.
- Login admin con Supabase Auth y comprobacion de `admin_profiles`.
- CRUD textual basico de configuracion, idiomas, tipos y elementos.
- Seed inicial sin multimedia real en `supabase/seeds/20260803_initial_content.sql`.

## Ejecucion local opcional

```bash
npm install
npm run dev
```

Validacion:

```bash
npm run lint
npm test
npm run build
```

## Variables

La configuracion principal del despliegue debe vivir en GitHub Actions Variables:

```text
Settings -> Secrets and variables -> Actions -> Variables
```

Variables publicas del frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PUBLIC_MEDIA_BASE_URL=
VITE_SITE_URL=
VITE_BASE_PATH=/viveutrera/
VITE_CUSTOM_DOMAIN=
```

No deben colocarse credenciales privadas de R2, Service Role Key de Supabase ni tokens administrativos en el frontend.

Variables privadas previstas para el Cloudflare Worker:

```env
SUPABASE_URL=
SUPABASE_JWT_SECRET_OR_VERIFICATION_CONFIG=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
PUBLIC_MEDIA_BASE_URL=
```

## Supabase

La migracion inicial esta en `supabase/migrations/20260803190000_initial_schema.sql`.
El contenido inicial esta en `supabase/seeds/20260803_initial_content.sql`.

Incluye:

- `admin_profiles` para autorizar usuarios autenticados.
- Idiomas, traducciones del sitio, tipos, elementos, imagenes, audios, enlaces y colaboradores.
- `media_assets` y `media_variants` para guardar metadatos y claves de objetos R2.
- RLS activado en las tablas publicas.
- Politicas publicas de solo lectura para contenido activo y publicado.
- Politicas administrativas basadas en `public.is_admin()`.

Para crear administradores, primero crea usuarios en Supabase Auth y despues inserta su `auth.users.id` en `public.admin_profiles`.

```sql
insert into public.admin_profiles (user_id)
values ('UUID_DEL_USUARIO');
```

## Cloudflare R2 y Worker

En esta fase no hay credenciales reales ni subida a R2. La app expone un contrato `StorageService` y un `mockStorageService`.

El Worker posterior debera:

- Verificar JWT de Supabase.
- Confirmar que el usuario esta en `admin_profiles`.
- Generar URLs firmadas o ejecutar operaciones seguras contra R2.
- Devolver `object_key` y metadatos para guardar en Supabase.

## SEO

La primera fase es una SPA para GitHub Pages. Esto permite despliegue simple, pero tiene limitaciones SEO porque el HTML de cada elemento no queda prerenderizado. La estructura queda lista para generar paginas estaticas por elemento mediante GitHub Actions si se necesita mejorar indexacion.

## Dominio

`public/CNAME.example` documenta el dominio personalizado. Cuando exista el dominio definitivo, copia su valor a `public/CNAME` o configura el workflow para generarlo desde `VITE_CUSTOM_DOMAIN`.

## Siguientes pasos

1. Ejecutar migracion y seed en Supabase.
2. Crear usuarios administradores y autorizar su UID en `admin_profiles`.
3. Completar CRUD de colaboradores y enlaces.
4. Crear Cloudflare Worker para R2.
5. Sustituir placeholders de marca e imagenes.
6. Completar subida, borrado y optimizacion de multimedia.
7. Preparar prerender o generacion estatica si el SEO organico pasa a ser prioritario.

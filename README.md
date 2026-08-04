# Vive Utrera

Guia audiovisual publica de Utrera, mobile-first y preparada para publicarse como sitio estatico en GitHub Pages.

## Estado

Fases implementadas:

- Vite, React, TypeScript y React Router.
- Rutas publicas: `/`, `/guia/:idioma`, `/guia/:idioma/elemento/:slug`.
- Rutas admin: `/admin/login`, `/admin`, `/admin/configuracion`, `/admin/idiomas`, `/admin/tipos`, `/admin/elementos`, `/admin/multimedia`, `/admin/enlaces`, `/admin/colaboradores`.
- Identidad visual base con variables CSS de Vive Utrera.
- Componentes reutilizables de botones, tarjetas, formularios, modales, confirmacion y estados.
- Datos simulados tipados y repositorios desacoplados.
- Cliente Supabase preparado por variables de entorno.
- Contrato de almacenamiento y Worker de Cloudflare preparado para subir a R2.
- Migracion SQL inicial con tablas, indices y RLS.
- Workflow de GitHub Pages.
- Repositorios publicos con Supabase real y fallback a mocks.
- Login admin con Supabase Auth y comprobacion de `admin_profiles`.
- CRUD textual basico de configuracion, idiomas, tipos, elementos, enlaces y colaboradores.
- Biblioteca multimedia para subir a R2 mediante Worker o registrar metadatos manualmente.
- Edicion multidioma de configuracion, tipos, elementos y colaboradores para ES, EN, FR y DE.
- Colaboradores con logo/imagen asociable desde la biblioteca multimedia.
- Detalle publico con enlaces complementarios reales por idioma desde Supabase.
- Selector de idioma publico con persistencia de preferencia y fallback explicito a espanol.
- SEO base en cliente: title, meta description, canonical, Open Graph, Twitter Cards, hreflang y JSON-LD inicial.
- Detalle publico con estados vacios, aviso de traduccion alternativa y navegacion anterior/siguiente.
- RLS endurecido para leer solo contenido activo/publicado y bloquear acceso admin sin `admin_profiles`.
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
VITE_UPLOAD_API_URL=
VITE_SITE_URL=
VITE_BASE_PATH=/viveutrera/
VITE_CUSTOM_DOMAIN=
```

No deben colocarse credenciales privadas de R2, Service Role Key de Supabase ni tokens administrativos en el frontend.

Variables privadas previstas para el Cloudflare Worker:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
PUBLIC_MEDIA_BASE_URL=
ALLOWED_ORIGINS=
```

## Supabase

La migracion inicial esta en `supabase/migrations/20260803190000_initial_schema.sql`.
El refuerzo de seguridad para bases ya creadas esta en `supabase/migrations/20260804173000_harden_rls_security.sql`.
El contenido inicial esta en `supabase/seeds/20260803_initial_content.sql`.

Incluye:

- `admin_profiles` para autorizar usuarios autenticados.
- Idiomas, traducciones del sitio, tipos, elementos, imagenes, audios, enlaces y colaboradores.
- `media_assets` y `media_variants` para guardar metadatos y claves de objetos R2.
- RLS activado en las tablas publicas.
- Politicas publicas de solo lectura para contenido activo, publicado y en idiomas activos.
- Politicas administrativas basadas en `public.is_admin()`.
- Constraints de base de datos para slugs y URLs.

Para crear administradores, primero crea usuarios en Supabase Auth y despues inserta su `auth.users.id` en `public.admin_profiles`.

```sql
insert into public.admin_profiles (user_id)
values ('UUID_DEL_USUARIO');
```

## Cloudflare R2 y Worker

El Worker esta en `worker/` y expone `POST /upload` para subir ficheros autenticados a R2.

Mientras R2 no este configurado, puedes seguir subiendo un archivo por fuera y registrar su `object_key` en `Admin -> Multimedia`. Si `VITE_PUBLIC_MEDIA_BASE_URL` apunta al dominio publico del bucket/CDN, la web resolvera ese asset con `mediaUrl(object_key)`. Ese registro ya puede asociarse a colaboradores como logo.

El Worker:

- Verificar JWT de Supabase.
- Confirmar que el usuario esta en `admin_profiles`.
- Ejecutar operaciones seguras contra el binding R2 `MEDIA_BUCKET`.
- Devolver `object_key` y metadatos para guardar en Supabase.

## SEO

La primera fase es una SPA para GitHub Pages. Esto permite despliegue simple, pero tiene limitaciones SEO porque el HTML de cada elemento no queda prerenderizado. La estructura queda lista para generar paginas estaticas por elemento mediante GitHub Actions si se necesita mejorar indexacion.

## Dominio

`public/CNAME.example` documenta el dominio personalizado. Cuando exista el dominio definitivo, copia su valor a `public/CNAME` o configura el workflow para generarlo desde `VITE_CUSTOM_DOMAIN`.

## Siguientes pasos

1. Ejecutar migraciones y seed en Supabase.
2. Crear usuarios administradores y autorizar su UID en `admin_profiles`.
3. Desplegar Cloudflare Worker para R2 y configurar `VITE_UPLOAD_API_URL`.
4. Sustituir placeholders de marca e imagenes.
5. Completar subida, borrado y optimizacion de multimedia.
6. Preparar prerender o generacion estatica si el SEO organico pasa a ser prioritario.
7. Anadir pruebas de accesibilidad y navegacion publica.

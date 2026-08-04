# Vive Utrera Media Worker

Worker de Cloudflare para subir ficheros desde `Admin -> Multimedia` a R2.

## Que hace

- Recibe `POST /upload` con `multipart/form-data`.
- Exige `Authorization: Bearer <supabase_access_token>`.
- Valida el usuario contra Supabase Auth.
- Comprueba que el usuario existe en `public.admin_profiles`.
- Sube el fichero al bucket R2 enlazado como `MEDIA_BUCKET`.
- Devuelve metadatos para registrar el asset en `public.media_assets`.

## Crear recursos en Cloudflare

1. Crea un bucket R2 llamado `viveutrera-media`.
2. Conecta un dominio publico al bucket, por ejemplo `media.viveutrera.es`.
3. Crea el Worker con el nombre `viveutrera-media-api`.
4. En el Worker, revisa que exista el binding R2:

```text
Binding: MEDIA_BUCKET
Bucket: viveutrera-media
```

## Configurar variables y secretos

En `Workers & Pages -> viveutrera-media-api -> Settings -> Variables and Secrets`:

Variables normales:

```env
PUBLIC_MEDIA_BASE_URL=https://media.viveutrera.es
ALLOWED_ORIGINS=https://viveutrera.es,https://www.viveutrera.es,https://viveutrera.github.io
```

Secrets:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Con binding R2 nativo no hace falta guardar `R2_ACCESS_KEY_ID` ni `R2_SECRET_ACCESS_KEY` en el Worker.

## Desplegar

Desde la raiz del repo:

```bash
npm run worker:deploy
```

Tambien puedes usar Wrangler directamente:

```bash
npx wrangler deploy --config worker/wrangler.jsonc
```

## Conectar el frontend

En GitHub, configura `Settings -> Secrets and variables -> Actions -> Variables`:

```env
VITE_UPLOAD_API_URL=https://viveutrera-media-api.<tu-subdominio-workers>.workers.dev
VITE_PUBLIC_MEDIA_BASE_URL=https://media.viveutrera.es
```

Despues ejecuta el workflow de GitHub Pages o haz un push a `main`.

## Prueba rapida

1. Entra en `/admin/multimedia`.
2. Selecciona destino, por ejemplo `Logo colaborador`.
3. Elige un fichero.
4. Pulsa `Subir a R2`.
5. Si termina bien, el registro aparece en la biblioteca multimedia.

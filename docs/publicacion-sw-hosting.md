# Publicación manual en SW Hosting

El frontend de React/Vite se publica como archivos estáticos. Supabase continúa
prestando el servicio de base de datos y autenticación. Esta primera fase conserva
los archivos multimedia en R2 y la API de subida en Cloudflare Workers.

## Compilación

Configurar `.env.local` (ignorado por Git) con las variables públicas de producción:

```dotenv
VITE_SUPABASE_URL=https://oartoepbgrxzyjmolgjf.supabase.co
VITE_SUPABASE_ANON_KEY=<clave pública anon del proyecto>
VITE_PUBLIC_MEDIA_BASE_URL=https://media.viveutrera.es
VITE_UPLOAD_API_URL=https://viveutrera-media-api.viveutrera.workers.dev
VITE_SITE_URL=https://viveutrera.es
VITE_ASSET_BASE_PATH=/
```

Nunca usar una clave `service_role` ni otras credenciales privadas en Vite.

```powershell
npm run lint
npm test
npm run build
```

El resultado es `dist`. Incluye `.htaccess`, el manifiesto, el service worker y
`preview/index.html`. No subir el código fuente, `.env.local` ni `node_modules`.

## Subida

1. Conservar una copia del `index.html` inicial del alojamiento fuera de la carpeta
   pública, por ejemplo descargándolo al ordenador.
2. Subir **el contenido** de `dist` a `/datos/web`. `index.html` debe quedar en
   `/datos/web/index.html`, no en `/datos/web/dist/index.html`.
3. Incluir el archivo oculto `.htaccess`. Usar SFTP o FTPS si están disponibles;
   el puerto SSH/SFTP indicado para este servicio es 2200. FTP/FTPS puede tener
   credenciales o puerto diferentes: usar los indicados en SWPanel.
4. En posteriores publicaciones subir primero los nuevos recursos de `assets`,
   después el resto y finalmente los HTML. Conservar los recursos antiguos hasta
   que los navegadores hayan renovado sus páginas abiertas.

## Prueba antes de cambiar DNS

No cambiar aún los servidores DNS. Se puede probar desde un equipo resolviendo
temporalmente `viveutrera.es` y `www.viveutrera.es` a `81.25.112.119` mediante su
archivo hosts. Esto afecta solo a ese equipo; retirar las entradas al terminar.
El alojamiento debe reconocer esos nombres y tener un certificado HTTPS válido.
No usar la IP como sustituto del dominio para validar PWA o autenticación.

Comprobar:

- `/` y `/preview/`.
- Una ficha y una ruta abiertas directamente y tras recargar.
- Acceso al administrador, datos reales de Supabase, imágenes y audios.
- `/sw.js`, `/manifest.webmanifest` y los iconos con respuestas correctas.
- Instalación PWA en Android y Añadir a pantalla de inicio en Safari/iPhone.
- Un recurso inexistente en `/assets/` debe dar 404, no HTML de React.

`.htaccess` configura Apache, pero SW Hosting tiene Nginx delante y sirve los
archivos estáticos desde él. Confirmar por HTTP que las rutas llegan a Apache y
que Nginx respeta las cabeceras de revalidación de HTML, service worker y manifiesto.
Si una ruta devuelve 404 o las cabeceras no se aplican, pedir el ajuste a soporte.
No se incluye redirección HTTPS/www en esta fase: configurarla y comprobarla en el
alojamiento una vez disponible el certificado.

Solo después de validar el nuevo alojamiento cambiar los registros web o los
servidores DNS. Preparar antes los registros de correo, `media` y cualquier otro
subdominio. Mantener Cloudflare Pages disponible durante la transición.

Esta migración parcial no elimina la dependencia de Cloudflare para multimedia,
subidas ni los posibles proveedores de infraestructura de Supabase.

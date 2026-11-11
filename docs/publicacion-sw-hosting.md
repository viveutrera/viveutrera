# Publicación manual en SW Hosting

El frontend de React/Vite se publica como archivos estáticos. Supabase continúa
prestando el servicio de base de datos y autenticación. La distribución SW lee
los archivos multimedia de `https://viveutrera.es/media`. La API de subida y
eliminación sigue en Cloudflare Workers hasta adaptar ese servicio.

## Compilación

Configurar `.env.local` (ignorado por Git) con las variables públicas de producción:

```dotenv
VITE_SUPABASE_URL=https://oartoepbgrxzyjmolgjf.supabase.co
VITE_SUPABASE_ANON_KEY=<clave pública anon del proyecto>
VITE_UPLOAD_API_URL=https://viveutrera-media-api.viveutrera.workers.dev
VITE_SITE_URL=https://viveutrera.es
VITE_ASSET_BASE_PATH=/
```

Nunca usar una clave `service_role` ni otras credenciales privadas en Vite.

El archivo versionado `.env.sw` establece la dirección de lectura multimedia
para `npm run build:sw`, con prioridad sobre `.env.local`. No hace falta editar
variables ni archivos del ZIP para publicar en SW. Las compilaciones normales
de Cloudflare conservan su configuración de multimedia independiente.

Durante esta fase, evitar subir o eliminar recursos desde el administrador:
su API todavía modifica R2, mientras los visitantes de SW leen la copia local.
Un recurso nuevo en R2 no estará disponible en SW hasta copiarlo a `media`.

```powershell
npm run lint
npm test
npm run build:sw
```

El resultado es `dist`. Incluye `.htaccess`, el manifiesto, el service worker y
`preview/index.html`. No subir el código fuente, `.env.local` ni `node_modules`.

## Identificación del alojamiento

La portada y el pie consultan `hosting-info.json` con una URL única y sin caché.
El service worker nuevo no lo almacena ni ofrece una copia sin conexión. Se
comprueba al abrir la vista, cada minuto y al recuperar el foco o la conexión.
Si no se recibe un JSON válido en cinco segundos, indica «Alojamiento sin verificar».
No se utiliza el nombre de dominio para decidir la etiqueta.

`npm run build:sw` genera automáticamente `{"hosting":"SW Hosting"}`.
Cloudflare Pages inyecta `CF_PAGES=1` y su compilación normal genera automáticamente
`{"hosting":"Cloudflare Pages"}`. El frontend comparte el mismo código, con
la configuración de multimedia propia de cada destino y el marcador
independiente del servidor. No copiar el marcador de SW a Pages o viceversa.
Una compilación sin destino conocido genera `{"hosting":null}`, sin atribuir un
alojamiento por defecto. No es necesario editar el archivo para el ZIP de SW.

El indicador identifica la respuesta del marcador en ese momento, no el origen
de todos los recursos ni el HTML que un navegador pudiera tener en caché.
Nginx debe respetar `Cache-Control: no-store` para este JSON; la URL única y la
petición sin caché evitan reutilizar comprobaciones previas durante la transición.

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
5. Conservar siempre la carpeta `/datos/web/media` ya subida: no forma parte del
   ZIP del frontend y no debe borrarse durante las publicaciones.

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

Esta migración parcial traslada la lectura multimedia a SW, pero no elimina la
dependencia de Cloudflare para subidas y eliminaciones, la copia de Pages ni los
posibles proveedores de infraestructura de Supabase. Conservar los originales R2.

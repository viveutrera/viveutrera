# Publicación manual en SW Hosting

El frontend de React/Vite se publica como archivos estáticos. Supabase continúa
prestando el servicio de base de datos y autenticación. La distribución SW lee
los archivos multimedia de `https://viveutrera.es/media`. La API PHP de subida y
eliminación está en `https://viveutrera.es/api/media.php` y valida los permisos
de administrador con Supabase.

## Compilación

Configurar `.env.local` (ignorado por Git) con las variables públicas de producción:

```dotenv
VITE_SUPABASE_URL=https://oartoepbgrxzyjmolgjf.supabase.co
VITE_SUPABASE_ANON_KEY=<clave pública anon del proyecto>
VITE_SITE_URL=https://viveutrera.es
VITE_ASSET_BASE_PATH=/
```

Nunca usar una clave `service_role` ni otras credenciales privadas en Vite.

El archivo versionado `.env.sw` establece las direcciones de lectura y API multimedia
para `npm run build:sw`, con prioridad sobre `.env.local`. No hace falta editar
variables ni archivos del ZIP para publicar en SW. Las compilaciones normales
de Cloudflare conservan su configuración de multimedia independiente.

Las compilaciones SW gestionan archivos exclusivamente en `/datos/web/media`.
La copia de Cloudflare conserva su Worker y R2: no usar su administrador durante
la migración, porque comparte la base de datos pero no los archivos nuevos.

```powershell
npm run lint
npm test
npm run build:sw
```

El resultado es `dist`. Incluye `.htaccess`, el manifiesto, el service worker y
`preview/index.html`. No subir el código fuente, `.env.local` ni `node_modules`.

## API de archivos en SW

Requiere PHP 8.1 o superior, las extensiones cURL y Fileinfo, salida HTTPS hacia
Supabase y permisos de escritura de PHP en la carpeta `media` y sus subcarpetas.
Se recomienda una versión de PHP con soporte activo. No utiliza MySQL, Node.js,
claves R2 ni credenciales `service_role`.

La compilación SW incluye `api/media.php`, `api/media-service.php`, un archivo
`api/media-config.php` generado automáticamente y los archivos ocultos del servicio.
La configuración usa únicamente la URL y la clave pública anon ya usadas por la
aplicación; su codificación base64 es de transporte, no un mecanismo de secreto.
No hay que editar el paquete. La compilación de Cloudflare no incluye archivos PHP.

- `GET /api/media.php?action=health`: comprueba requisitos locales básicos, no una
  sesión de administrador ni la conexión completa con Supabase.
- `POST /api/media.php?action=upload`: multipart con `file` y `target`.
- `POST /api/media.php?action=delete`: JSON con `objectKeys`, hasta 100 archivos.

Ambas operaciones exigen `Authorization: Bearer <sesión Supabase>`. La API valida
la sesión en Auth y la pertenencia a `admin_profiles` usando el mismo token y RLS.
Un fallo de Supabase bloquea la operación. No se aceptan usuarios anfitriones.
Solo admite imágenes JPEG, PNG, WebP y GIF y audio MP3, WAV, Ogg, M4A, AAC, FLAC o
WebM según su MIME real. El servidor asigna una extensión segura, genera nombres
aleatorios y solo permite operar dentro de `site`, `element-image`, `element-audio`
y `collaborator`. No permite rutas con retrocesos, archivos ejecutables ni enlaces
simbólicos. Una petición de borrado valida todas las rutas antes de eliminar.

El máximo de aplicación es 50 MiB. `api/.user.ini` solicita `upload_max_filesize=50M`
y `post_max_size=56M`; puede tardar en aplicarse y no sustituye los límites de Nginx
ni una política del proveedor. Si falla una subida grande, revisar con soporte
esos límites y el límite del cuerpo de petición de Nginx. No utilizar permisos 777.

Para publicar: subir primero toda la carpeta `api` y comprobar que health devuelve
`{"ok":true,"storage":"SW Hosting"}`. Después subir assets y los HTML al final.
Si health devuelve HTML, PHP se descarga como texto, o no hay permisos de escritura,
no activar el frontend nuevo y pedir a soporte que revise la ejecución PHP.
Verificar una imagen de prueba, su miniatura y un audio desde el administrador;
comprobar después su eliminación. No borrar archivos reales para esta prueba.

Las operaciones de archivos y las escrituras de metadatos en Supabase siguen
siendo dos pasos independientes, como con el Worker anterior. No hay una
transacción conjunta entre disco y base de datos.

Pruebas locales adicionales (Python estándar y PHP con cURL/Fileinfo):

```powershell
python scripts/test-sw-media.py --php C:\ruta\php.exe
```

Estas pruebas arrancan servidores locales temporales y un sustituto de Supabase;
no utilizan credenciales ni datos de producción.

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

La distribución SW ya no utiliza R2 ni Workers para leer, subir o eliminar archivos.
Mantiene Supabase como backend. La copia de Pages sigue teniendo su configuración
independiente y no se sincroniza automáticamente con los archivos de SW.
Conservar los originales R2 como copia hasta terminar las comprobaciones.

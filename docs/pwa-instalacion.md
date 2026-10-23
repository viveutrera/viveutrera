# Instalación PWA en Android y iPhone

La dirección principal es `https://viveutrera.es`. El manifiesto conserva el
identificador `/` y abre `/preview/`. La compilación genera
`dist/preview/index.html` para que GitHub Pages sirva la entrada con HTTP 200,
sin depender de una página 404 ni de JavaScript para resolver la ruta inicial.
Los recursos compilados usan rutas absolutas para funcionar desde esa entrada.

Los iconos Android siguen siendo PNG de 192 y 512 píxeles, con propósitos
`any maskable`. Sus URL incluyen una versión para evitar reutilizar las imágenes
anteriores. El enlace `apple-touch-icon` y su PNG de 180 píxeles se conservan.

El service worker precarga la entrada real y los tres iconos. La versión de caché
es `vive-utrera-shell-v4`; el manifiesto se consulta primero por red para que sus
cambios no queden bloqueados en caché. Las navegaciones con 404 o sin conexión
usan la entrada precargada. Las respuestas de navegación autenticadas no se
guardan en la caché pública.

## Publicación

Publicar los cambios mediante el workflow habitual de GitHub Pages. Comprobar
que `/preview/`, `/manifest.webmanifest` y los iconos devuelven HTTP 200.
`/preview` debe redirigir a `/preview/`.

### Dominio con www (configuración externa en Cloudflare)

El dominio `www.viveutrera.es` devuelve actualmente 404. Esto no se corrige con
archivos del repositorio: la petición llega a Cloudflare antes de cargar la app.

En la zona `viveutrera.es`, crear una Single Redirect Rule:

- Condición: `(http.host eq "www.viveutrera.es")`.
- URL de destino dinámica: `concat("https://viveutrera.es", http.request.uri.path)`.
- Código: 301.
- Conservar la cadena de consulta: activado.

Mantener el registro DNS de `www` con proxy de Cloudflare habilitado para que la
regla pueda ejecutarse. No es necesario cambiar el dominio principal ni el CNAME
del repositorio. Verificar la redirección tanto de `/` como del manifiesto y los
iconos, conservando las rutas y consultas.

## Validación

`npm run lint`, `npm test` y `npm run build` deben pasar. Las pruebas PWA cubren
precarga, actualización de manifiesto, limpieza de cachés y fallback de navegación.

Servir `dist` con un servidor estático sin fallback SPA y comprobar en navegador
que se activa el service worker y se precargan la entrada y los tres iconos.
La validación local de octubre de 2026 pasó con esta configuración.

Tras publicar, completar la prueba en dispositivos reales:

1. Android: abrir `https://viveutrera.es` en Chrome y usar la opción de instalar
   la aplicación. Verificar el icono y que la aplicación abre la guía.
2. iPhone: abrir la misma dirección en Safari, usar Compartir > Añadir a la
   pantalla de inicio y verificar el icono y la apertura.
3. Si existe un acceso directo antiguo con icono genérico, eliminar ese acceso
   directo y volver a instalar después de cargar la versión publicada.

La comprobación de dimensiones, decodificación y enlace del icono Apple no
sustituye la prueba de instalación en un iPhone real.

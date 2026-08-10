# Guia De Funcionalidades Implementadas

Documento base para preparar un manual, presentacion o guia de uso de Vive Utrera.

## Vision General

Vive Utrera es una guia audiovisual publica de Utrera, pensada especialmente para moviles, con administracion privada, contenidos multidioma, multimedia en Cloudflare R2 y datos gestionados en Supabase.

La web permite consultar lugares de interes, ver fotografias, escuchar audioguias, abrir ubicaciones, consultar enlaces complementarios y participar en tours en tiempo real dirigidos por anfitriones.

## Tecnologia Y Arquitectura

- Frontend con Vite, React y TypeScript.
- Rutas con React Router.
- Datos en Supabase PostgreSQL.
- Autenticacion con Supabase Auth.
- Seguridad con Row Level Security.
- Multimedia en Cloudflare R2.
- Operaciones privadas de R2 mediante Cloudflare Worker.
- Despliegue actual en Cloudflare Pages.
- Estilos propios con identidad visual Vive Utrera.

## Identidad Visual

- Azul principal: `#0D2B4D`.
- Rojo acento: `#B22226`.
- Piedra: `#D8C7A6`.
- Blanco: `#FFFFFF`.
- Logotipo e imagenes de marca integrados.
- Uso de banderas para selector de idioma.
- Pie de pagina con marca e iconos sociales.

## Web Publica

### Pagina Temporal

- Ruta principal temporal con imagen y texto "PROXIMAMENTE".
- La web publica de trabajo sigue accesible desde la ruta de preview.
- Carga con animacion suave.

### Landing Page

- Hero visual con imagen configurable.
- Imagen de portada del hero configurable.
- Textos principales configurables por idioma.
- Selector de idiomas mediante tarjetas con banderas redondas.
- Selector superior de idioma con banderas rectangulares.
- Seccion de funciones:
  - Audioguias;
  - Historia;
  - Fiestas y tradiciones.
- Seccion de tours:
  - Crear tour;
  - Unirse a un tour.
- Carrusel de colaboradores.
- Colaborador especial.
- Pie de pagina corporativo.

### Guia Publica

- Ruta por idioma: `/guia/:idioma`.
- Imagen representativa de ciudad/guia configurable.
- Titulo y texto introductorio por idioma.
- Buscador de elementos.
- Filtros por tipo de elemento.
- Filtros en carrusel horizontal cuando no caben.
- Recuerda el ultimo filtro usado al volver desde una ficha.
- Tarjetas de elementos con imagen, nombre y texto corto.
- Tamano estable de tarjetas en escritorio.
- Adaptacion responsive para movil.
- Animacion progresiva de carga al hacer scroll.

### Lugares Cercanos

- Boton "Que tengo cerca?".
- Solicita ubicacion del navegador.
- Calcula distancias localmente, sin enviar la ubicacion a Supabase.
- Usa coordenadas `latitude` y `longitude`.
- Muestra los tres lugares mas cercanos.
- Muestra distancia aproximada.
- Gestiona errores sin mensajes nativos.
- Incluye informacion de privacidad.

### Ficha De Elemento

- Tipo de elemento.
- Nombre.
- Texto corto.
- Texto largo desplegable.
- Opcion para mostrar texto largo abierto por defecto.
- Respeta saltos de linea del texto largo.
- Boton de ubicacion si existe URL de Google Maps.
- Galeria de imagenes.
- Miniaturas.
- Visor de imagenes.
- Audios por idioma.
- Reproductor que evita reproducir varios audios a la vez.
- Enlaces complementarios por idioma.
- Selector de idioma con banderas.
- Pie de pagina.

## Multidioma

- Idiomas iniciales:
  - Espanol;
  - Ingles;
  - Frances;
  - Aleman.
- Idiomas gestionados desde base de datos.
- Textos de interfaz separados del contenido.
- Contenido traducible por idioma.
- Selector de idioma en landing, guia y detalle.
- Persistencia de idioma elegido.
- Fallback controlado cuando falta traduccion.

## Administracion

### Acceso

- Login administrativo protegido con Supabase Auth.
- Pantalla de login con marca Vive Utrera.
- Recuperacion de contrasena para anfitriones.
- Cierre de sesion con confirmacion.

### Panel Y Navegacion

- Barra lateral izquierda fija.
- Contenido principal con scroll independiente.
- Menu `Advanced Setup - Webmaster` desplegable.
- Enlace a web publica en nueva pestana.
- Secciones de administracion:
  - configuracion;
  - idiomas;
  - tipos;
  - elementos;
  - colaboradores;
  - anfitriones;
  - multimedia/ajustes avanzados.

### Configuracion

- Configuracion de textos por idioma en pestanas.
- Campos en solo lectura hasta pulsar "Editar".
- Guardado con aviso modal propio.
- Configuracion de imagenes principales:
  - imagen portada hero;
  - imagen fondo hero;
  - imagen ciudad/guia.
- Previsualizacion de imagenes en tarjetas.
- Subida y borrado de imagenes desde modal.
- Resumen de subida con tamano original y optimizado.
- Textos configurables de colaboradores y agradecimiento especial.

### Idiomas

- Lista tipo tabla.
- Alta mediante modal.
- Edicion en pagina propia.
- Borrado con confirmacion.
- Iconos de bandera junto al idioma.
- Activacion, orden y datos principales.

### Tipos De Elemento

- Lista tipo tabla.
- Columna de orden.
- Alta mediante modal.
- Slug automatico a partir del nombre.
- Desplegable de iconos validos.
- Traducciones por idioma con banderas.
- Edicion y borrado.

### Elementos

- Lista tipo tabla.
- Click en fila para abrir ficha.
- Datos en solo lectura al entrar.
- Botones separados para editar y guardar.
- Slug automatico al crear.
- Coordenadas `latitude` y `longitude`.
- Boton para obtener coordenadas desde URL de Google Maps.
- Mensaje modal de exito/error al guardar coordenadas.
- Traducciones por idioma con banderas.
- Marca para mostrar texto largo desplegado por defecto.

### Imagenes De Elementos

- Gestion dentro de la ficha del elemento.
- Lista de imagenes con datos principales.
- Boton para subir nueva imagen.
- Modal de subida.
- Optimizacion antes de subir.
- Generacion de imagen principal y miniatura.
- Edicion de datos y orden.
- Confirmacion antes de borrar.
- Borrado coordinado de R2 y Supabase.

### Audios De Elementos

- Gestion dentro de la ficha del elemento.
- Lista de audios.
- Boton para subir nuevo audio.
- Modal de subida.
- Validacion de formato, tamano y duracion.
- Edicion de datos y orden.
- Confirmacion antes de borrar.
- Borrado coordinado.

### Enlaces De Elementos

- Gestion dentro de la ficha del elemento.
- Lista de enlaces asociados.
- Alta mediante modal.
- Edicion y borrado.
- El apartado independiente de enlaces queda absorbido por elementos.

### Colaboradores

- Lista tipo tabla.
- Columna de colaborador especial.
- Alta mediante modal.
- Edicion en pagina propia.
- Campo para ocultar nombre.
- Campo para marcar colaborador especial.
- Imagen/logo del colaborador.
- Si ya tiene imagen, el boton de subida queda deshabilitado hasta borrar la anterior.
- Al subir nueva imagen se muestra resumen de optimizacion.
- Carrusel publico automatico de colaboradores.

### Anfitriones

- Administracion de usuarios anfitriones.
- Crear anfitrion desde admin.
- Activar/desactivar anfitrion.
- Modificar datos.
- Borrar anfitrion.
- Creacion segura mediante Supabase Edge Function.
- No se usa service role key en el navegador.
- El anfitrion establece su contrasena mediante recuperacion/invitacion.

## Multimedia Y Cloudflare R2

- Cloudflare R2 para imagenes, miniaturas, audios y logotipos.
- Cloudflare Worker para operaciones seguras.
- El frontend no contiene credenciales privadas.
- Subida mediante autorizacion temporal.
- Guardado de metadatos en Supabase:
  - object key;
  - nombre original;
  - MIME type;
  - tamano;
  - dimensiones;
  - duracion en audios cuando aplica.
- Construccion centralizada de URLs publicas.
- Eliminacion coordinada de archivo y registro.

## Optimizacion De Imagenes

- Conversion a WebP.
- Reduccion de resolucion.
- Eliminacion de metadatos innecesarios.
- Generacion de version principal.
- Generacion de miniatura.
- Objetivo aproximado:
  - principal: 300 KB;
  - miniatura: 50-60 KB.
- Si la imagen original es menor que el resultado optimizado, se conserva la original o se evita empeorar el tamano.
- Vista de resumen tras la subida.

## Tours En Tiempo Real

### Anfitrion

- Login como anfitrion.
- Area `/host`.
- Crear tour.
- Codigo aleatorio de 5 numeros y 1 letra.
- Copiar codigo.
- Iniciar tour.
- Finalizar tour con confirmacion.
- Ver participantes conectados mediante Presence.
- Acceso a la guia para enviar elementos.

### Visitante

- Unirse a tour desde la landing.
- No necesita cuenta.
- Introduce codigo del tour.
- Se normaliza el codigo.
- Se valida formato.
- Si el tour esta activo, se une como participante anonimo.
- La sesion se mantiene localmente.
- Indicador persistente de tour activo.
- Puede abandonar el tour.

### Envio De Elementos

- El anfitrion, dentro de una ficha de elemento, ve el boton "Enviar al tour".
- Solo aparece si tiene un tour activo.
- Se confirma mediante modal.
- Se guarda evento en `tour_events`.
- Se emite Broadcast por Supabase Realtime.
- El visitante recibe una notificacion visual.
- La notificacion no cambia de pagina automaticamente.
- La notificacion no interrumpe audios.
- El visitante decide si pulsa "Abrir".

### Seguridad Realtime

- Canales privados con nombre `tour:{uuid}`.
- No se usa el codigo visible como canal de seguridad.
- Politicas sobre `realtime.messages`.
- Visitantes pueden recibir eventos y publicar Presence solo en tours activos.
- Solo anfitrion propietario o admin puede emitir Broadcast.

## Base De Datos

Se han creado o ampliado migraciones para:

- configuracion del sitio;
- idiomas;
- traducciones;
- tipos;
- elementos;
- coordenadas;
- imagenes;
- audios;
- enlaces;
- colaboradores;
- perfiles;
- anfitriones;
- tours;
- eventos de tour;
- politicas RLS;
- politicas Realtime.

Tablas destacadas:

- `site_settings`
- `languages`
- `site_translations`
- `media_assets`
- `media_variants`
- `element_types`
- `element_type_translations`
- `elements`
- `element_translations`
- `element_images`
- `element_image_translations`
- `element_audios`
- `element_links`
- `collaborators`
- `collaborator_translations`
- `profiles`
- `tours`
- `tour_events`

## Seguridad

- RLS activado en tablas expuestas.
- Lectura publica solo para contenido activo/publicado.
- Escritura restringida a usuarios autorizados.
- Separacion conceptual entre:
  - admin;
  - host;
  - visitante anonimo.
- Cloudflare Worker protege operaciones privadas de R2.
- Supabase Edge Function protege creacion de anfitriones.
- No hay secretos privados en el frontend.

## Despliegue

- El proyecto empezo orientado a GitHub Pages.
- Se migro a Cloudflare Pages por problemas de despliegue en GitHub Pages.
- Cloudflare Pages despliega desde `main`.
- El dominio personalizado apunta a Cloudflare Pages.
- GitHub se mantiene como repositorio principal.

## Variables Importantes

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_MEDIA_BASE_URL`
- `VITE_SITE_URL`
- `VITE_BASE_PATH`
- `VITE_R2_WORKER_URL`

Worker/backend:

- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET_OR_VERIFICATION_CONFIG`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `PUBLIC_MEDIA_BASE_URL`

## Flujos Para Manual O Presentacion

### Flujo Publico Basico

1. Entrar en la web.
2. Elegir idioma.
3. Abrir la guia.
4. Buscar o filtrar elementos.
5. Abrir una ficha.
6. Ver imagenes.
7. Escuchar audio.
8. Abrir ubicacion o enlaces.

### Flujo De Lugares Cercanos

1. Entrar en la guia.
2. Pulsar "Que tengo cerca?".
3. Autorizar ubicacion.
4. Revisar los tres lugares mas cercanos.
5. Abrir la ficha de uno de ellos.

### Flujo De Administracion

1. Entrar en `/admin/login`.
2. Iniciar sesion.
3. Abrir una seccion.
4. Crear o editar datos.
5. Subir multimedia si aplica.
6. Guardar.
7. Ver los cambios en la web publica.

### Flujo De Tour

1. El administrador crea un anfitrion.
2. El anfitrion recupera o establece su contrasena.
3. El anfitrion inicia sesion.
4. Crea un tour.
5. Inicia el tour.
6. Comparte el codigo.
7. El visitante pulsa "Unirse a un tour".
8. Introduce el codigo.
9. El anfitrion abre una ficha de elemento.
10. Pulsa "Enviar al tour".
11. El visitante recibe la indicacion.
12. El visitante decide si abre el elemento.

## Comprobaciones Habituales

Antes de dar una fase por cerrada se han usado:

- `npm.cmd run lint`
- `npm.cmd test`
- `npm.cmd run build`

## Notas Operativas

- Las migraciones SQL deben ejecutarse manualmente en Supabase si no se usa CLI enlazada.
- Las Edge Functions deben desplegarse en Supabase cuando cambian.
- El Worker de Cloudflare debe desplegarse aparte del frontend.
- Cloudflare Pages despliega automaticamente al hacer push a `main`.
- Si se cambian variables de entorno en Cloudflare Pages, hay que relanzar el despliegue.

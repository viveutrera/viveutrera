# Pendientes De Los Prompts

Documento de seguimiento de lo que queda pendiente del prompt inicial de Vive Utrera y del prompt Util2.

## Prompt Util2

El prompt Util2 incorpora dos grandes funcionalidades: lugares cercanos y tours en tiempo real con anfitriones. La base funcional ya esta implementada, pero quedan estos puntos pendientes o mejorables.

### Tours En Tiempo Real

- Avisar a los participantes conectados cuando el anfitrion finaliza un tour.
- Mostrar un estado especifico de "Tour finalizado" al visitante si sigue navegando despues del cierre.
- Opcional: emitir tambien eventos futuros de tipo `message`, `notice` o `meeting_point`. La base de datos ya esta preparada, pero la interfaz no los usa todavia.

### Historial De Indicaciones

- Mostrar una pequena lista de indicaciones recientes dentro de la sesion del visitante.
- Diferenciar visualmente la ultima indicacion recibida de las anteriores.
- Mantener el comportamiento actual de no abrir automaticamente el elemento.

### Pruebas Pendientes

- Ampliar pruebas de permisos:
  - un anfitrion no puede modificar tours ajenos;
  - un visitante no puede emitir eventos;
  - un tour finalizado no admite eventos;
  - un tour expirado no admite participantes.
- Ampliar pruebas de Realtime:
  - recepcion de elementos;
  - recuperacion de ultima indicacion;
  - errores de canal;
  - presence con varios participantes.
- Probar manualmente el flujo completo con dos navegadores en produccion.

### Documentacion Pendiente

- Documentar el flujo completo de tours:
  - crear anfitrion;
  - recuperar contrasena;
  - crear tour;
  - iniciar tour;
  - unirse como visitante;
  - enviar elemento;
  - finalizar tour.
- Documentar la configuracion de Supabase Realtime y las migraciones necesarias.

### Revision Visual

- Revisar responsive del area de anfitrion en movil.
- Revisar mensajes de error de Realtime para que, si falla una suscripcion, el usuario vea un aviso claro.

## Prompt Inicial

El prompt inicial define la guia audiovisual completa. La mayor parte de la web publica, administracion, Supabase, R2, Worker, colaboradores, multimedia y tours esta implementada, pero quedan bloques importantes para cerrar el proyecto como producto completo.

### PWA

- Crear o completar `manifest.webmanifest`.
- Preparar iconos PWA definitivos.
- Implementar service worker mantenible.
- Definir estrategia de cache limitada:
  - shell de la aplicacion;
  - recursos esenciales;
  - ultima pagina visitada;
  - no cachear indiscriminadamente audios e imagenes.

### SEO Avanzado

- Documentar claramente las limitaciones SEO de una SPA.
- Preparar, si se decide, generacion estatica o prerender por elemento.
- Revisar Open Graph, Twitter Cards y JSON-LD en landing y fichas.
- Validar canonical y `hreflang` en produccion.

### Audio

- Implementar optimizacion real de audio o integracion externa:
  - MP3;
  - mono;
  - 64 u 80 kbps;
  - duracion y tamano objetivo.
- Mantener la validacion actual como primera barrera.
- Decidir si se usa `ffmpeg.wasm`, proceso externo o servicio backend.

### Cloudflare R2

- Implementar deteccion de recursos huerfanos:
  - archivos en R2 sin registro en Supabase;
  - registros en Supabase cuyo archivo ya no existe.
- Preparar una pantalla o herramienta de auditoria para administradores/webmaster.
- Revisar eliminacion coordinada en todos los casos borde.

### Administracion

- Revisar accesibilidad completa de modales:
  - foco inicial;
  - restauracion de foco;
  - bloqueo de scroll;
  - cierre con teclado;
  - etiquetas de campos.
- Revisar todos los borrados importantes y sus mensajes de consecuencias.
- Completar documentacion de operacion diaria para administradores.

### Analitica Y Panel

- Definir si se implementa analitica propia o externa.
- Posibles metricas:
  - visitas;
  - elementos visualizados;
  - imagenes abiertas;
  - audios reproducidos;
  - idiomas mas usados;
  - tours creados y finalizados.
- Si se implementa analitica propia, revisar privacidad y consentimiento.

### Pruebas

- Ampliar pruebas unitarias y de integracion:
  - rutas publicas;
  - rutas admin;
  - cambio de idioma;
  - filtros;
  - subida de imagenes;
  - borrado de multimedia;
  - RLS;
  - Worker de Cloudflare;
  - flujos de tours.
- Crear una checklist manual de QA:
  - movil;
  - escritorio;
  - navegacion por teclado;
  - carga lenta;
  - datos vacios;
  - errores de Supabase;
  - errores de R2.

### Documentacion General

- Completar README o documentos separados para:
  - instalacion;
  - variables de entorno;
  - Supabase;
  - migraciones;
  - Edge Functions;
  - Cloudflare Pages;
  - Worker;
  - R2;
  - copias de seguridad;
  - creacion de administradores;
  - creacion de anfitriones;
  - recuperacion ante errores.

### Despliegue

- El prompt inicial hablaba de GitHub Pages, pero el proyecto se migro a Cloudflare Pages por problemas de despliegue y tamano.
- Pendiente solo si se quiere: limpiar definitivamente workflows de GitHub Pages que ya no se usen.
- Documentar Cloudflare Pages como despliegue oficial actual.

## Prioridad Recomendada

1. Aviso de tour finalizado a visitantes.
2. Documentacion de tours y operacion diaria.
3. Revision responsive y accesibilidad.
4. Pruebas ampliadas de seguridad y Realtime.
5. PWA.
6. SEO/prerender.
7. Auditoria de recursos R2.
8. Analitica o panel de uso.

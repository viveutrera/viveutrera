insert into public.languages (id, code, locale, name, native_name, flag_code, is_active, is_default, sort_order)
values
  ('11111111-1111-1111-1111-111111111111', 'es', 'es-ES', 'Espanol', 'Espanol', 'ES', true, true, 1),
  ('22222222-2222-2222-2222-222222222222', 'en', 'en-GB', 'Ingles', 'English', 'GB', true, false, 2),
  ('33333333-3333-3333-3333-333333333333', 'fr', 'fr-FR', 'Frances', 'Francais', 'FR', true, false, 3),
  ('44444444-4444-4444-4444-444444444444', 'de', 'de-DE', 'Aleman', 'Deutsch', 'DE', true, false, 4)
on conflict (code) do update set
  locale = excluded.locale,
  name = excluded.name,
  native_name = excluded.native_name,
  flag_code = excluded.flag_code,
  is_active = excluded.is_active,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order;

insert into public.site_translations (
  language_id,
  hero_title,
  hero_slogan,
  hero_description,
  city_title,
  city_text,
  language_card_text,
  language_card_button,
  seo_title,
  seo_description
)
values
  ('11111111-1111-1111-1111-111111111111', 'Guia audiovisual de Utrera', 'Mucho mas que una visita, una forma de conocerla', 'Descubre monumentos, calles y lugares de interes de Utrera mediante fotografias, mapas y audioguias.', 'Una ciudad para escuchar con calma', 'Patrimonio, plazas, callejones y espacios culturales reunidos en una guia publica pensada para el movil.', 'Comienza tu visita en espanol.', 'Ver guia', 'Vive Utrera | Guia audiovisual de Utrera', 'Guia publica de monumentos, calles y lugares de interes de Utrera.'),
  ('22222222-2222-2222-2222-222222222222', 'Audiovisual guide to Utrera', 'Much more than a visit, a way to know it', 'Discover Utrera monuments, streets and places of interest through photos, maps and audio guides.', 'A city to hear slowly', 'Heritage, squares, streets and cultural spaces gathered in a mobile-first public guide.', 'Discover Utrera in English.', 'View guide', 'Vive Utrera | Audiovisual guide', 'Public guide to Utrera monuments, streets and places of interest.'),
  ('33333333-3333-3333-3333-333333333333', 'Guide audiovisuel d Utrera', 'Bien plus qu une visite, une facon de la connaitre', 'Decouvrez les monuments, rues et lieux d interet d Utrera avec photos, cartes et audioguides.', 'Une ville a ecouter doucement', 'Patrimoine, places, rues et espaces culturels reunis dans un guide public mobile.', 'Decouvrez Utrera en francais.', 'Voir le guide', 'Vive Utrera | Guide audiovisuel', 'Guide public des monuments, rues et lieux d interet d Utrera.'),
  ('44444444-4444-4444-4444-444444444444', 'Audiovisueller Reisefuhrer fur Utrera', 'Viel mehr als ein Besuch, eine Art sie kennenzulernen', 'Entdecken Sie Utreras Denkmaler, Strassen und Orte mit Fotos, Karten und Audioguides.', 'Eine Stadt zum ruhigen Zuhoren', 'Kulturerbe, Platze, Strassen und Kulturorte in einem mobilen offentlichen Guide.', 'Entdecken Sie Utrera auf Deutsch.', 'Guide ansehen', 'Vive Utrera | Audiovisueller Guide', 'Offentlicher Guide zu Denkmalern, Strassen und Orten in Utrera.')
on conflict (language_id) do update set
  hero_title = excluded.hero_title,
  hero_slogan = excluded.hero_slogan,
  hero_description = excluded.hero_description,
  city_title = excluded.city_title,
  city_text = excluded.city_text,
  language_card_text = excluded.language_card_text,
  language_card_button = excluded.language_card_button,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

insert into public.media_assets (id, object_key, media_type, mime_type, original_name, file_size, width, height)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'brand/logo-horizontal-placeholder.svg', 'image', 'image/svg+xml', 'logo-horizontal-placeholder.svg', 1024, 640, 180)
on conflict (object_key) do update set mime_type = excluded.mime_type;

insert into public.element_types (id, slug, icon, sort_order, is_active)
values
  ('55555555-5555-5555-5555-555555555555', 'monumentos', 'landmark', 1, true),
  ('66666666-6666-6666-6666-666666666666', 'calles', 'map', 2, true),
  ('77777777-7777-7777-7777-777777777777', 'cultura', 'music', 3, true)
on conflict (slug) do update set icon = excluded.icon, sort_order = excluded.sort_order, is_active = excluded.is_active;

insert into public.element_type_translations (element_type_id, language_id, name, description)
values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Monumentos', 'Edificios y espacios patrimoniales.'),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Calles', 'Calles y rincones con interes historico.'),
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Cultura', 'Espacios culturales y recursos para visitantes.'),
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Monuments', 'Heritage buildings and spaces.'),
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'Streets', 'Streets and historic corners.'),
  ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'Culture', 'Cultural spaces and visitor resources.'),
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Monuments', 'Batiments et espaces patrimoniaux.'),
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Rues', 'Rues et coins historiques.'),
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Culture', 'Espaces culturels et ressources pour visiteurs.'),
  ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'Denkmaler', 'Bauwerke und Orte des Kulturerbes.'),
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'Strassen', 'Strassen und historische Winkel.'),
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Kultur', 'Kulturorte und Ressourcen fur Besucher.')
on conflict (element_type_id, language_id) do update set name = excluded.name, description = excluded.description;

insert into public.elements (id, slug, element_type_id, maps_url, status, is_featured, sort_order, published_at)
values
  ('88888888-8888-8888-8888-888888888888', 'parroquia-santiago', '55555555-5555-5555-5555-555555555555', 'https://maps.google.com/?q=Parroquia+de+Santiago+Utrera', 'published', true, 1, now()),
  ('99999999-9999-9999-9999-999999999999', 'castillo-de-utrera', '55555555-5555-5555-5555-555555555555', null, 'published', false, 2, now())
on conflict (slug) do update set
  element_type_id = excluded.element_type_id,
  maps_url = excluded.maps_url,
  status = excluded.status,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  published_at = excluded.published_at;

insert into public.element_translations (element_id, language_id, name, short_text, long_text, seo_title, seo_description, is_published)
values
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Parroquia de Santiago', 'Uno de los grandes hitos patrimoniales del centro historico.', 'Contenido inicial para validar la guia publica conectada a Supabase.', 'Parroquia de Santiago en Utrera', 'Informacion audiovisual de la Parroquia de Santiago.', true),
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Castillo de Utrera', 'Recinto historico vinculado a la memoria defensiva de la ciudad.', 'Contenido inicial para preparar la estructura editorial.', 'Castillo de Utrera', 'Guia audiovisual del Castillo de Utrera.', true),
  ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'Santiago Parish Church', 'One of the main heritage landmarks in the historic centre.', 'Initial content to validate the public guide connected to Supabase.', 'Santiago Parish Church in Utrera', 'Audiovisual information about Santiago Parish Church.', true),
  ('99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 'Utrera Castle', 'Historic site linked to the defensive memory of the city.', 'Initial content for the editorial structure.', 'Utrera Castle', 'Audiovisual guide to Utrera Castle.', true),
  ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 'Paroisse de Santiago', 'Un repere patrimonial majeur du centre historique.', 'Contenu initial pour valider le guide public connecte a Supabase.', 'Paroisse de Santiago a Utrera', 'Information audiovisuelle de la paroisse de Santiago.', true),
  ('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', 'Chateau d Utrera', 'Site historique lie a la memoire defensive de la ville.', 'Contenu initial pour preparer la structure editoriale.', 'Chateau d Utrera', 'Guide audiovisuel du chateau d Utrera.', true),
  ('88888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 'Pfarrkirche Santiago', 'Ein wichtiges Kulturerbe im historischen Zentrum.', 'Erste Inhalte zur Validierung des offentlichen Guides mit Supabase.', 'Pfarrkirche Santiago in Utrera', 'Audiovisuelle Informationen zur Pfarrkirche Santiago.', true),
  ('99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'Burg von Utrera', 'Historischer Ort der Stadtgeschichte.', 'Erste Inhalte fur die redaktionelle Struktur.', 'Burg von Utrera', 'Audiovisueller Guide zur Burg von Utrera.', true)
on conflict (element_id, language_id) do update set
  name = excluded.name,
  short_text = excluded.short_text,
  long_text = excluded.long_text,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  is_published = excluded.is_published;

insert into public.element_images (id, element_id, media_asset_id, is_cover, sort_order)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true, 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true, 1)
on conflict (id) do update set is_cover = excluded.is_cover, sort_order = excluded.sort_order;

insert into public.element_image_translations (element_image_id, language_id, title, alt_text, caption)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Imagen temporal', 'Marcador visual temporal de Vive Utrera', 'Imagen temporal pendiente de sustituir.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Imagen temporal', 'Marcador visual temporal de Vive Utrera', 'Imagen temporal pendiente de sustituir.')
on conflict (element_image_id, language_id) do update set title = excluded.title, alt_text = excluded.alt_text, caption = excluded.caption;

insert into public.element_links (id, element_id, language_id, title, url, link_type, sort_order, is_published)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Abrir ubicacion en Google Maps', 'https://maps.google.com/?q=Parroquia+de+Santiago+Utrera', 'mapa', 1, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Informacion turistica de Utrera', 'https://www.turismoutrera.org/', 'turismo', 1, true)
on conflict (id) do update set
  title = excluded.title,
  url = excluded.url,
  link_type = excluded.link_type,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

insert into public.collaborators (id, name, media_asset_id, url, sort_order, is_active, is_special)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Colaborador institucional', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 1, true, true)
on conflict (id) do update set name = excluded.name, media_asset_id = excluded.media_asset_id, sort_order = excluded.sort_order, is_active = excluded.is_active, is_special = excluded.is_special;

insert into public.collaborator_translations (collaborator_id, language_id, display_name, thank_you_text)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Colaborador institucional', 'Agradecimiento especial pendiente de configurar.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Institutional collaborator', 'Special thanks pending configuration.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Collaborateur institutionnel', 'Remerciement special a configurer.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'Institutioneller Partner', 'Besonderer Dank muss noch konfiguriert werden.')
on conflict (collaborator_id, language_id) do update set display_name = excluded.display_name, thank_you_text = excluded.thank_you_text;

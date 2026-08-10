import type { Collaborator, ElementType, GuideElement, Language, LanguageCode, SiteContent } from '../domain/types';

export const languages: Language[] = [
  { id: 'lang-es', code: 'es', locale: 'es-ES', name: 'Español', nativeName: 'Español', flagCode: 'ES', isActive: true, isDefault: true, sortOrder: 1, cardText: 'Comienza tu visita en español.', cardButton: 'Ver guia' },
  { id: 'lang-en', code: 'en', locale: 'en-GB', name: 'English', nativeName: 'English', flagCode: 'GB', isActive: true, isDefault: false, fallbackLanguageId: 'lang-es', sortOrder: 2, cardText: 'Discover Utrera in English.', cardButton: 'View guide' },
  { id: 'lang-fr', code: 'fr', locale: 'fr-FR', name: 'Frances', nativeName: 'Francais', flagCode: 'FR', isActive: true, isDefault: false, fallbackLanguageId: 'lang-es', sortOrder: 3, cardText: 'Decouvrez Utrera en francais.', cardButton: 'Voir le guide' },
  { id: 'lang-de', code: 'de', locale: 'de-DE', name: 'Aleman', nativeName: 'Deutsch', flagCode: 'DE', isActive: true, isDefault: false, fallbackLanguageId: 'lang-es', sortOrder: 4, cardText: 'Entdecken Sie Utrera auf Deutsch.', cardButton: 'Guide ansehen' }
];

export const siteContent: Record<LanguageCode, SiteContent> = {
  es: {
    heroTitle: 'Guia audiovisual de Utrera',
    heroSlogan: 'Mucho mas que una visita, una forma de conocerla',
    heroDescription: 'Descubre monumentos, calles y lugares de interes de Utrera mediante fotografias, mapas y audioguias.',
    cityTitle: 'Una ciudad para escuchar con calma',
    cityText: 'Patrimonio, plazas, callejones y espacios culturales reunidos en una guia publica pensada para el movil.',
    collaboratorSectionText: 'Logotipos y agradecimientos configurables desde administracion.',
    specialCollaboratorLabel: 'Agradecimiento especial',
    seoTitle: 'Vive Utrera | Guia audiovisual de Utrera',
    seoDescription: 'Guia publica de monumentos, calles y lugares de interes de Utrera.'
  },
  en: {
    heroTitle: 'Audiovisual guide to Utrera',
    heroSlogan: 'Much more than a visit, a way to know it',
    heroDescription: 'Discover Utrera monuments, streets and places of interest through photos, maps and audio guides.',
    cityTitle: 'A city to hear slowly',
    cityText: 'Heritage, squares, streets and cultural spaces gathered in a mobile-first public guide.',
    collaboratorSectionText: 'Logos and acknowledgements configured from administration.',
    specialCollaboratorLabel: 'Special thanks',
    seoTitle: 'Vive Utrera | Audiovisual guide',
    seoDescription: 'Public guide to Utrera monuments, streets and places of interest.'
  },
  fr: {
    heroTitle: 'Guide audiovisuel d Utrera',
    heroSlogan: 'Bien plus qu une visite, une facon de la connaitre',
    heroDescription: 'Decouvrez les monuments, rues et lieux d interet d Utrera avec photos, cartes et audioguides.',
    cityTitle: 'Une ville a ecouter doucement',
    cityText: 'Patrimoine, places, rues et espaces culturels reunis dans un guide public mobile.',
    collaboratorSectionText: 'Logos et remerciements configures depuis l administration.',
    specialCollaboratorLabel: 'Remerciement special',
    seoTitle: 'Vive Utrera | Guide audiovisuel',
    seoDescription: 'Guide public des monuments, rues et lieux d interet d Utrera.'
  },
  de: {
    heroTitle: 'Audiovisueller Reisefuhrer fur Utrera',
    heroSlogan: 'Viel mehr als ein Besuch, eine Art sie kennenzulernen',
    heroDescription: 'Entdecken Sie Utreras Denkmaler, Strassen und Orte mit Fotos, Karten und Audioguides.',
    cityTitle: 'Eine Stadt zum ruhigen Zuhoren',
    cityText: 'Kulturerbe, Platze, Strassen und Kulturorte in einem mobilen offentlichen Guide.',
    collaboratorSectionText: 'Logos und Danksagungen aus der Verwaltung.',
    specialCollaboratorLabel: 'Besonderer Dank',
    seoTitle: 'Vive Utrera | Audiovisueller Guide',
    seoDescription: 'Offentlicher Guide zu Denkmalern, Strassen und Orten in Utrera.'
  }
};

export const elementTypes: ElementType[] = [
  { id: 'type-monument', slug: 'monumentos', icon: 'landmark', isActive: true, sortOrder: 1, name: { es: 'Monumentos', en: 'Monuments', fr: 'Monuments', de: 'Denkmaler' } },
  { id: 'type-street', slug: 'calles', icon: 'map', isActive: true, sortOrder: 2, name: { es: 'Calles', en: 'Streets', fr: 'Rues', de: 'Strassen' } },
  { id: 'type-culture', slug: 'cultura', icon: 'music', isActive: true, sortOrder: 3, name: { es: 'Cultura', en: 'Culture', fr: 'Culture', de: 'Kultur' } }
];

const image = {
  id: 'asset-cover',
  objectKey: 'brand/logo-vive-utrera.png',
  mediaType: 'image' as const,
  mimeType: 'image/png',
  originalName: 'logo-vive-utrera.png',
  fileSize: 348481,
  width: 461,
  height: 524
};

export const elements: GuideElement[] = [
  {
    id: 'element-santiago',
    slug: 'parroquia-santiago',
    typeId: 'type-monument',
    mapsUrl: 'https://maps.google.com/?q=Parroquia+de+Santiago+Utrera',
    status: 'published',
    isFeatured: true,
    showLongTextDefault: false,
    sortOrder: 1,
    translations: {
      es: { name: 'Parroquia de Santiago', shortText: 'Uno de los grandes hitos patrimoniales del centro historico.', longText: 'Maqueta inicial para validar la experiencia de detalle con textos largos, galeria y audioguia.', seoTitle: 'Parroquia de Santiago en Utrera', seoDescription: 'Informacion audiovisual de la Parroquia de Santiago.', isPublished: true },
      en: { name: 'Santiago Parish Church', shortText: 'One of the main heritage landmarks in the historic centre.', longText: 'Initial mock content for the detail experience.', seoTitle: 'Santiago Parish Church in Utrera', seoDescription: 'Audiovisual information about Santiago Parish Church.', isPublished: true },
      fr: { name: 'Paroisse de Santiago', shortText: 'Un repere patrimonial majeur du centre historique.', longText: 'Contenu de maquette pour la page de detail.', seoTitle: 'Paroisse de Santiago a Utrera', seoDescription: 'Information audiovisuelle de la paroisse.', isPublished: true },
      de: { name: 'Pfarrkirche Santiago', shortText: 'Ein wichtiges Kulturerbe im historischen Zentrum.', longText: 'Beispielinhalt fur die Detailseite.', seoTitle: 'Pfarrkirche Santiago in Utrera', seoDescription: 'Audiovisuelle Informationen zur Kirche.', isPublished: true }
    },
    images: [{ id: 'img-santiago', mediaAsset: image, isCover: true, sortOrder: 1, translations: { es: { title: 'Vista principal', altText: 'Marcador visual temporal de Vive Utrera', caption: 'Imagen temporal pendiente de sustituir.' }, en: { title: 'Main view', altText: 'Temporary Vive Utrera visual marker' }, fr: { title: 'Vue principale', altText: 'Marqueur visuel temporaire' }, de: { title: 'Hauptansicht', altText: 'Temporarer visueller Platzhalter' } } }],
    audios: [{ id: 'audio-santiago-es', languageCode: 'es', title: 'Introduccion', durationSeconds: 95, mediaAsset: { ...image, id: 'asset-audio', objectKey: 'audio/placeholder.mp3', mediaType: 'audio', mimeType: 'audio/mpeg', durationSeconds: 95 }, sortOrder: 1, isPublished: true }],
    links: [{ id: 'link-santiago', languageCode: 'es', title: 'Abrir ubicacion', url: 'https://maps.google.com/?q=Parroquia+de+Santiago+Utrera', linkType: 'map', sortOrder: 1, isPublished: true }]
  },
  {
    id: 'element-castillo',
    slug: 'castillo-de-utrera',
    typeId: 'type-monument',
    status: 'published',
    isFeatured: false,
    showLongTextDefault: false,
    sortOrder: 2,
    translations: {
      es: { name: 'Castillo de Utrera', shortText: 'Recinto historico vinculado a la memoria defensiva de la ciudad.', longText: 'Contenido simulado para preparar estructura editorial y multimedia.', seoTitle: 'Castillo de Utrera', seoDescription: 'Guia audiovisual del Castillo de Utrera.', isPublished: true },
      en: { name: 'Utrera Castle', shortText: 'Historic site linked to the defensive memory of the city.', longText: 'Mock content for editorial and multimedia structure.', seoTitle: 'Utrera Castle', seoDescription: 'Audiovisual guide to Utrera Castle.', isPublished: true },
      fr: { name: 'Chateau d Utrera', shortText: 'Site historique lie a la memoire defensive de la ville.', longText: 'Contenu simule.', seoTitle: 'Chateau d Utrera', seoDescription: 'Guide audiovisuel du chateau.', isPublished: true },
      de: { name: 'Burg von Utrera', shortText: 'Historischer Ort der Stadtgeschichte.', longText: 'Beispielinhalt.', seoTitle: 'Burg von Utrera', seoDescription: 'Audiovisueller Guide zur Burg.', isPublished: true }
    },
    images: [{ id: 'img-castillo', mediaAsset: image, isCover: true, sortOrder: 1, translations: { es: { title: 'Imagen temporal', altText: 'Placeholder del Castillo de Utrera' }, en: { title: 'Temporary image', altText: 'Utrera Castle placeholder' }, fr: { title: 'Image temporaire', altText: 'Placeholder du chateau' }, de: { title: 'Temporare Grafik', altText: 'Platzhalter der Burg' } } }],
    audios: [],
    links: []
  }
];

export const collaborators: Collaborator[] = [
  { id: 'collab-city', name: 'Colaborador institucional', mediaAsset: image, sortOrder: 1, isActive: true, isSpecial: true, showName: true, translations: { es: { displayName: 'Colaborador institucional', thankYouText: 'Agradecimiento especial pendiente de configurar.' }, en: { displayName: 'Institutional collaborator', thankYouText: 'Special thanks pending configuration.' }, fr: { displayName: 'Collaborateur institutionnel' }, de: { displayName: 'Institutioneller Partner' } } }
];

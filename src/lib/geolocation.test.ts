import { describe, expect, it } from 'vitest';
import type { GuideElement } from '../domain/types';
import { extractGoogleMapsCoordinates, formatDistance, getNearestElements, haversineDistanceMeters } from './geolocation';

const baseElement: GuideElement = {
  id: 'base',
  slug: 'base',
  typeId: 'type',
  status: 'published',
  isFeatured: false,
  showLongTextDefault: false,
  sortOrder: 0,
  translations: {
    es: { name: 'Base', shortText: '', longText: '', seoTitle: '', seoDescription: '', isPublished: true },
    en: { name: 'Base', shortText: '', longText: '', seoTitle: '', seoDescription: '', isPublished: true },
    fr: { name: 'Base', shortText: '', longText: '', seoTitle: '', seoDescription: '', isPublished: true },
    de: { name: 'Base', shortText: '', longText: '', seoTitle: '', seoDescription: '', isPublished: true }
  },
  images: [],
  audios: [],
  links: []
};

function element(id: string, latitude?: number, longitude?: number): GuideElement {
  return {
    ...baseElement,
    id,
    slug: id,
    latitude,
    longitude,
    translations: {
      ...baseElement.translations,
      es: { ...baseElement.translations.es, name: id }
    }
  };
}

describe('geolocation helpers', () => {
  it('calculates haversine distance between coordinates', () => {
    const distance = haversineDistanceMeters(
      { latitude: 37.181, longitude: -5.78 },
      { latitude: 37.183, longitude: -5.782 }
    );

    expect(distance).toBeGreaterThan(250);
    expect(distance).toBeLessThan(300);
  });

  it('returns only the nearest three elements with valid coordinates', () => {
    const nearest = getNearestElements([
      element('without-coordinates'),
      element('far', 37.3, -5.9),
      element('first', 37.1811, -5.7801),
      element('third', 37.185, -5.785),
      element('second', 37.182, -5.781),
      element('invalid', 95, -5.78)
    ], { latitude: 37.181, longitude: -5.78 });

    expect(nearest).toHaveLength(3);
    expect(nearest.map((item) => item.element.id)).toEqual(['first', 'second', 'third']);
  });

  it('formats meters and kilometers in a friendly way', () => {
    expect(formatDistance(85.4, 'es')).toBe('85 m');
    expect(formatDistance(1420, 'es')).toBe('1,4 km');
  });

  it('extracts coordinates from common Google Maps URLs', () => {
    expect(extractGoogleMapsCoordinates('https://www.google.com/maps/place/Utrera/@37.181,-5.78,17z')).toEqual({ latitude: 37.181, longitude: -5.78 });
    expect(extractGoogleMapsCoordinates('https://www.google.com/maps/search/?api=1&query=37.1825%2C-5.7815')).toEqual({ latitude: 37.1825, longitude: -5.7815 });
    expect(extractGoogleMapsCoordinates('https://www.google.com/maps/place/foo/data=!3m1!4b1!4m6!3m5!1s0x0!8m2!3d37.183!4d-5.782')).toEqual({ latitude: 37.183, longitude: -5.782 });
  });

  it('ignores Google Maps URLs without usable coordinates', () => {
    expect(extractGoogleMapsCoordinates('https://maps.google.com/?q=Parroquia+de+Santiago+Utrera')).toBeUndefined();
    expect(extractGoogleMapsCoordinates('https://www.google.com/maps/@95,-5.78,17z')).toBeUndefined();
  });
});

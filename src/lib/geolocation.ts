import type { GuideElement, LanguageCode } from '../domain/types';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NearbyElement {
  element: GuideElement;
  distanceMeters: number;
}

const earthRadiusMeters = 6371000;

export function hasValidCoordinates(element: GuideElement) {
  return isValidLatitude(element.latitude) && isValidLongitude(element.longitude);
}

export function isValidLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function haversineDistanceMeters(origin: Coordinates, destination: Coordinates) {
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);

  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export function getNearestElements(elements: GuideElement[], origin: Coordinates, limit = 3): NearbyElement[] {
  return elements
    .filter(hasValidCoordinates)
    .map((element) => {
      const latitude = element.latitude as number;
      const longitude = element.longitude as number;
      return {
        element,
        distanceMeters: haversineDistanceMeters(origin, { latitude, longitude })
      };
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, limit);
}

export function formatDistance(distanceMeters: number, language: LanguageCode) {
  if (distanceMeters < 1000) return `${Math.max(1, Math.round(distanceMeters))} m`;
  const formatter = new Intl.NumberFormat(language, {
    maximumFractionDigits: 1,
    minimumFractionDigits: distanceMeters < 10000 ? 1 : 0
  });
  return `${formatter.format(distanceMeters / 1000)} km`;
}

export function extractGoogleMapsCoordinates(value: string): Coordinates | undefined {
  const input = value.trim();
  if (!input) return undefined;

  const candidates = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:,|$)/,
    /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:[,&]|$)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)(?:!|$)/
  ];
  const decoded = safeDecodeURIComponent(input);

  for (const pattern of candidates) {
    const match = decoded.match(pattern) ?? input.match(pattern);
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (isValidLatitude(latitude) && isValidLongitude(longitude)) return { latitude, longitude };
  }

  return undefined;
}

function toRadians(degrees: number) {
  return degrees * Math.PI / 180;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

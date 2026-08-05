export const elementTypeIconOptions = [
  { value: 'landmark', label: 'Monumento' },
  { value: 'church', label: 'Iglesia' },
  { value: 'building', label: 'Edificio' },
  { value: 'map', label: 'Mapa' },
  { value: 'route', label: 'Ruta' },
  { value: 'tree-palm', label: 'Parque / naturaleza' },
  { value: 'music', label: 'Musica / audio' },
  { value: 'theater', label: 'Cultura / teatro' },
  { value: 'camera', label: 'Fotografia' },
  { value: 'utensils', label: 'Gastronomia' },
  { value: 'info', label: 'Informacion' }
];

export function isElementTypeIcon(value: string) {
  return elementTypeIconOptions.some((option) => option.value === value);
}

export function elementTypeIconLabel(value: string) {
  return elementTypeIconOptions.find((option) => option.value === value)?.label ?? value;
}

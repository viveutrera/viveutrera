export const linkTypeOptions = [
  { value: '', label: 'General' },
  { value: 'mapa', label: 'Mapa / ubicacion' },
  { value: 'web', label: 'Web oficial' },
  { value: 'reserva', label: 'Reserva / entradas' },
  { value: 'documento', label: 'Documento' },
  { value: 'video', label: 'Video' },
  { value: 'red-social', label: 'Red social' }
];

export function linkTypeLabel(value?: string | null) {
  return linkTypeOptions.find((option) => option.value === (value ?? ''))?.label ?? value ?? 'General';
}

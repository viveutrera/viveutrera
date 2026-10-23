import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { elements, elementTypes } from '../data/mockData';
import { NearbyPlacesModal } from './NearbyPlacesModal';

afterEach(cleanup);

const nearbyElement = elements[1];

function DetailWithNearbyPlaces() {
  const [isOpen, setOpen] = useState(true);
  const location = useLocation();
  return (
    <>
      <output aria-label="Ficha actual">{location.pathname}{location.search}</output>
      <NearbyPlacesModal
        isOpen={isOpen}
        language="es"
        contentLanguage="es"
        results={[{ element: nearbyElement, distanceMeters: 150 }]}
        types={elementTypes}
        isLocating={false}
        selectedTypeId="type-monument"
        onClose={() => setOpen(false)}
      />
    </>
  );
}

describe('nearby places navigation', () => {
  it.each(['Abrir ficha', nearbyElement.translations.es.name])('closes the modal and preserves the type filter when selecting %s', (linkName) => {
    render(
      <MemoryRouter initialEntries={['/guia/es/elemento/parroquia-santiago?tipo=type-monument']}>
        <Routes><Route path="/guia/:language/elemento/:slug" element={<DetailWithNearbyPlaces />} /></Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Abrir ficha' })).toHaveClass('button-primary');
    fireEvent.click(screen.getByRole('link', { name: linkName }));
    expect(screen.getByLabelText('Ficha actual')).toHaveTextContent(`/guia/es/elemento/${nearbyElement.slug}?tipo=type-monument`);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

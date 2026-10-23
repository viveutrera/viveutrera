import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializePwaInstall } from '../lib/pwaInstall';
import { PwaInstallButton } from './PwaInstallButton';

let stopListening: () => void;

beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value() { this.setAttribute('open', ''); } },
    close: { configurable: true, value() {
      if (this.hasAttribute('open')) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      }
    } }
  });
  stopListening = initializePwaInstall();
});

afterEach(() => {
  cleanup();
  stopListening();
  vi.restoreAllMocks();
});

function offerInstallation(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  window.dispatchEvent(event);
  return { event, prompt };
}

describe('footer app installation', () => {
  it('uses an install offer captured before the footer mounts and hides after acceptance', async () => {
    const { event, prompt } = offerInstallation('accepted');
    expect(event.defaultPrevented).toBe(true);
    render(<PwaInstallButton language="es" />);
    fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }));
    expect(prompt).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Instalar app' })).not.toBeInTheDocument());
  });

  it('keeps the access after dismissal and does not reuse a consumed install offer', async () => {
    const { prompt } = offerInstallation('dismissed');
    render(<PwaInstallButton language="es" />);
    fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Instalar app' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }));
    expect(await screen.findByRole('dialog', { name: 'Instala Vive Utrera' })).toBeVisible();
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('shows iPhone instructions when the browser does not offer a native prompt', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) AppleWebKit Safari');
    render(<PwaInstallButton language="es" />);
    fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(screen.getByText('En Safari, pulsa el botón Compartir.')).toBeVisible();
    expect(screen.getByText('Selecciona «Añadir a la pantalla de inicio».')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('hides the access when installation completes elsewhere in the browser', () => {
    render(<PwaInstallButton language="en" />);
    expect(screen.getByRole('button', { name: 'Install app' })).toBeVisible();
    act(() => { window.dispatchEvent(new Event('appinstalled')); });
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  });
});

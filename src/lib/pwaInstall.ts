interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installPrompt: InstallPromptEvent | undefined;
let installed = false;
const listeners = new Set<() => void>();

export function subscribePwaInstall(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isPwaInstalled() {
  return installed;
}

function notify() {
  listeners.forEach((listener) => listener());
}

// Capture the event before data-dependent pages have mounted their footer.
export function initializePwaInstall() {
  const standalone = window.matchMedia?.('(display-mode: standalone)');
  const fullscreen = window.matchMedia?.('(display-mode: fullscreen)');
  const ios = navigator as Navigator & { standalone?: boolean };
  const detectInstalled = () => {
    installed = Boolean(standalone?.matches || fullscreen?.matches || ios.standalone);
    notify();
  };
  const onPrompt = (event: Event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
  };
  const onInstalled = () => {
    installed = true;
    installPrompt = undefined;
    notify();
  };

  detectInstalled();
  window.addEventListener('beforeinstallprompt', onPrompt);
  window.addEventListener('appinstalled', onInstalled);
  standalone?.addEventListener('change', detectInstalled);
  fullscreen?.addEventListener('change', detectInstalled);

  return () => {
    window.removeEventListener('beforeinstallprompt', onPrompt);
    window.removeEventListener('appinstalled', onInstalled);
    standalone?.removeEventListener('change', detectInstalled);
    fullscreen?.removeEventListener('change', detectInstalled);
  };
}

export async function requestPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = installPrompt;
  if (!event) return 'unavailable';
  installPrompt = undefined;
  // Keep prompt() in the button's user gesture; the event can only be used once.
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') {
    installed = true;
    notify();
  }
  return outcome;
}

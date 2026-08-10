export interface ParticipantTourSession {
  tourId: string;
  code: string;
  participantToken: string;
  joinedAt: string;
  expiresAt: string;
}

const storageKey = 'vive-utrera-active-tour';
const sessionEventName = 'vive-utrera-tour-session-change';

export function getParticipantTourSession(): ParticipantTourSession | undefined {
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as ParticipantTourSession;
    if (!parsed.tourId || !parsed.code || !parsed.participantToken) return undefined;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      clearParticipantTourSession();
      return undefined;
    }
    return parsed;
  } catch {
    clearParticipantTourSession();
    return undefined;
  }
}

export function saveParticipantTourSession(input: { tourId: string; code: string; expiresAt: string }) {
  const session: ParticipantTourSession = {
    tourId: input.tourId,
    code: input.code,
    participantToken: crypto.randomUUID(),
    joinedAt: new Date().toISOString(),
    expiresAt: input.expiresAt
  };
  sessionStorage.setItem(storageKey, JSON.stringify(session));
  emitTourSessionChange();
  return session;
}

export function clearParticipantTourSession() {
  sessionStorage.removeItem(storageKey);
  emitTourSessionChange();
}

export function normalizeTourCode(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function isValidTourCode(value: string) {
  return /^[0-9]{5}[A-Z]$/.test(normalizeTourCode(value));
}

export function subscribeTourSessionChange(callback: () => void) {
  window.addEventListener(sessionEventName, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(sessionEventName, callback);
    window.removeEventListener('storage', callback);
  };
}

function emitTourSessionChange() {
  window.dispatchEvent(new Event(sessionEventName));
}

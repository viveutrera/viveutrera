const ROUTE_SESSION_KEY = 'viveutrera:active-route';
const ROUTE_SESSION_EVENT = 'viveutrera:route-session-change';

export interface ActiveRouteSession {
  routeId: string;
  currentIndex: number;
}

export function getActiveRouteSession(): ActiveRouteSession | undefined {
  try {
    const raw = localStorage.getItem(ROUTE_SESSION_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<ActiveRouteSession>;
    if (!parsed.routeId || typeof parsed.currentIndex !== 'number') return undefined;
    return { routeId: parsed.routeId, currentIndex: Math.max(0, parsed.currentIndex) };
  } catch {
    return undefined;
  }
}

export function startRoute(routeId: string, currentIndex = 0) {
  return saveRouteSession({ routeId, currentIndex });
}

export function goToPreviousRouteElement() {
  const current = getActiveRouteSession();
  if (!current) return undefined;
  return saveRouteSession({ ...current, currentIndex: Math.max(0, current.currentIndex - 1) });
}

export function goToNextRouteElement() {
  const current = getActiveRouteSession();
  if (!current) return undefined;
  return saveRouteSession({ ...current, currentIndex: current.currentIndex + 1 });
}

export function finishRoute() {
  clearRouteSession();
}

export function exitRoute() {
  clearRouteSession();
}

export function setRouteCurrentIndex(routeId: string, currentIndex: number) {
  return saveRouteSession({ routeId, currentIndex: Math.max(0, currentIndex) });
}

export function subscribeRouteSessionChange(callback: () => void) {
  window.addEventListener(ROUTE_SESSION_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(ROUTE_SESSION_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function saveRouteSession(session: ActiveRouteSession) {
  localStorage.setItem(ROUTE_SESSION_KEY, JSON.stringify(session));
  notifyRouteSessionChange();
  return session;
}

function clearRouteSession() {
  localStorage.removeItem(ROUTE_SESSION_KEY);
  notifyRouteSessionChange();
}

function notifyRouteSessionChange() {
  window.dispatchEvent(new Event(ROUTE_SESSION_EVENT));
}

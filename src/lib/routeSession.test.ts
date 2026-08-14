import { beforeEach, describe, expect, it } from 'vitest';
import { finishRoute, getActiveRouteSession, goToNextRouteElement, goToPreviousRouteElement, startRoute } from './routeSession';

describe('route session helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores active route id and current index locally', () => {
    startRoute('route-1', 2);
    expect(getActiveRouteSession()).toEqual({ routeId: 'route-1', currentIndex: 2 });
  });

  it('moves through route indexes and clears the active route', () => {
    startRoute('route-1', 1);
    expect(goToNextRouteElement()).toEqual({ routeId: 'route-1', currentIndex: 2 });
    expect(goToPreviousRouteElement()).toEqual({ routeId: 'route-1', currentIndex: 1 });
    finishRoute();
    expect(getActiveRouteSession()).toBeUndefined();
  });
});

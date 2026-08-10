import { describe, expect, it } from 'vitest';
import { tourChannelName } from './realtimeTourService';

describe('realtime tour service', () => {
  it('builds tour channels from the internal tour uuid', () => {
    expect(tourChannelName('f7d8d98e-3b83-4e67-a673-7d7c4b33805d')).toBe('tour:f7d8d98e-3b83-4e67-a673-7d7c4b33805d');
  });
});

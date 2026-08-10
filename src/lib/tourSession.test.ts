import { describe, expect, it } from 'vitest';
import { isValidTourCode, normalizeTourCode } from './tourSession';

describe('tour session helpers', () => {
  it('normalizes tour codes to five numbers and one uppercase letter', () => {
    expect(normalizeTourCode(' 58321 f ')).toBe('58321F');
  });

  it('validates the public tour code format', () => {
    expect(isValidTourCode('58321F')).toBe(true);
    expect(isValidTourCode('5832F')).toBe(false);
    expect(isValidTourCode('ABCDE1')).toBe(false);
  });
});

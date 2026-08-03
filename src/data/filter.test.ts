import { describe, expect, it } from 'vitest';
import { guideRepository } from './repositories';

describe('guide repository mocks', () => {
  it('returns published Spanish elements', async () => {
    const elements = await guideRepository.getElements('es');
    expect(elements.length).toBeGreaterThan(0);
    expect(elements.every((element) => element.status === 'published')).toBe(true);
  });
});

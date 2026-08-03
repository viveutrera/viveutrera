import { describe, expect, it } from 'vitest';
import { t } from './ui';

describe('ui translations', () => {
  it('returns localized labels and falls back to Spanish keys', () => {
    expect(t('en', 'guide')).toBe('View guide');
    expect(t('de', 'missing')).toBe('missing');
  });
});

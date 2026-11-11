import { describe, it, expect } from 'vitest';
import { settingsCopy } from '@/lib/i18n/fragments/settings';

describe('settings v2 copy', () => {
  it('provides the main sections in both languages', () => {
    for (const locale of ['he', 'en'] as const) {
      expect(Object.keys(settingsCopy[locale])).toEqual(expect.arrayContaining(['home', 'notifications', 'agent', 'appearance', 'plan', 'privacy']));
    }
  });
});

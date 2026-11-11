import { describe, it, expect } from 'vitest';
import { PRIVACY_SECTIONS } from '../content';
import he from '@/lib/i18n/dictionaries/he.json';
import en from '@/lib/i18n/dictionaries/en.json';

describe('deletion disclosures', () => {
  it('explains retained household data and manual review in both languages', () => {
    const section = JSON.stringify(PRIVACY_SECTIONS.find((s) => s.id === 'retention'));
    expect(section).toContain('household and its shared content remain');
    expect(section).toContain('הבית והתוכן המשותף נשארים');
    for (const dict of [en, he]) {
      const text = JSON.stringify(dict.privacy.delete);
      expect(text).not.toMatch(/holds none of your|לא נשאר בה שום מידע|will be removed shortly|יימחקו בהקדם/);
    }
    expect(en.privacy.delete.i3).toContain('even if you are the last member');
    expect(he.privacy.delete.i3).toContain('גם אם אתם האחרונים');
  });
});

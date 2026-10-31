import {describe, expect, it} from 'vitest';
import {StyleDef} from '@thomas-inst/typesetter';
import {SystemStyleSheet} from '@/defaults/EditionStyles/SystemStyleSheet';

describe('System edition stylesheets', () => {
  const cases: [string, string][] = [];
  ['la', 'he', 'ar'].forEach((lang) => {
    Object.keys(SystemStyleSheet.getStyleSheetsForLanguage(lang)).forEach((id) => {
      cases.push([lang, id]);
    });
  });

  it.each(cases)('%s/%s defines a sectionBreak glue equal to the default lineSkip', (lang, id) => {
    const ssDef = SystemStyleSheet.getStyleSheetsForLanguage(lang)[id];
    const sectionBreak = ssDef.sectionBreak as StyleDef | undefined;
    expect(sectionBreak).toBeDefined();
    expect(sectionBreak?.parent).toBe('');
    expect(sectionBreak?.glue?.width).toBe(ssDef.default.paragraph?.lineSkip);
    expect(sectionBreak?.glue?.stretch).toBe('0');
    expect(sectionBreak?.glue?.shrink).toBe('0');
  });
});

import {describe, expect, it} from 'vitest';
import {CtDataEditionGenerator} from '@/Edition/EditionGenerator/CtDataEditionGenerator';
import {createLargeCtData, SMALL_CT_DATA, withToggledCustomSubEntry} from './LargeCtDataFixture';

describe('LargeCtDataFixture', () => {
  it('is deterministic', () => {
    expect(JSON.stringify(createLargeCtData(SMALL_CT_DATA))).toEqual(JSON.stringify(createLargeCtData(SMALL_CT_DATA)));
  });

  it('generates an edition with apparatus entries and custom sub-entries', () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const edition = new CtDataEditionGenerator({ctData}).generateEdition();
    expect(edition.mainText.length).toBeGreaterThan(SMALL_CT_DATA.numColumns * 0.9);
    const criticus = edition.apparatuses[0];
    expect(criticus.entries.length).toBeGreaterThan(SMALL_CT_DATA.numColumns * 0.05);
    const customSubEntries = criticus.entries.flatMap((e) => e.subEntries).filter((se) => se.source === 'user');
    expect(customSubEntries.length).toBe(SMALL_CT_DATA.numCustomEntries);
  });

  it('toggling a custom sub-entry changes only that sub-entry', () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const toggled = withToggledCustomSubEntry(ctData, 3);
    const enabled = (d: typeof ctData) => new CtDataEditionGenerator({ctData: d}).generateEdition().apparatuses[0].entries
      .flatMap((e) => e.subEntries).filter((se) => se.source === 'user' && !se.enabled).length;
    expect(enabled(ctData)).toBe(0);
    expect(enabled(toggled)).toBe(1);
  });
});

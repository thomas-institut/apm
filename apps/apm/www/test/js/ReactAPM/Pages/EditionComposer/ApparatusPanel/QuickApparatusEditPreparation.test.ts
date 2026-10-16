import {getPlainText} from '@thomas-inst/fmt-text';
import {describe, expect, it} from 'vitest';
import {CtDataEditionGenerator} from '@/Edition/EditionGenerator/CtDataEditionGenerator';
import {Edition} from '@/Edition/Edition';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {getCtRangeForMainTextRange} from '@/Edition/ApparatusEntryCustomization';
import {QuickApparatusEditAction} from '@/ReactAPM/Pages/EditionComposer/Actions/QuickApparatusEditAction';
import {prepareQuickEdit} from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditPreparation';
import {
  IDENTICAL_SUB_ENTRY_ERROR,
  QuickSubEntryData
} from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil';
import {createLargeCtData, SMALL_CT_DATA} from '../../../../benchmark/LargeCtDataFixture';

function generate(ctData: CtDataInterface): Edition {
  return new CtDataEditionGenerator({ctData}).generateEdition();
}

const newSubEntry: QuickSubEntryData = {type: 'variant', text: 'quickword', witnesses: [0, 1]};

function findTokenWithoutEntry(edition: Edition): number {
  const covered = new Set<number>();
  edition.apparatuses[0].entries.forEach((e) => {
    for (let i = e.from; i <= e.to; i++) {
      covered.add(i);
    }
  });
  const index = edition.mainText.findIndex((t, i) => t.type === 'text' && !covered.has(i));
  expect(index).not.toBe(-1);
  return index;
}

describe('prepareQuickEdit', () => {
  it('prepares a toggle of an existing entry', () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const edition = generate(ctData);
    const result = prepareQuickEdit(ctData, edition, {
      kind: 'toggleSubEntry', apparatusIndex: 0, entryIndex: 0, subEntryIndex: 0
    });
    expect('prepared' in result).toBe(true);
    if ('prepared' in result) {
      expect(result.prepared.apparatusType).toBe(edition.apparatuses[0].type);
      expect(result.prepared.description).toMatch(/^Disable sub-entry/);
      expect(result.prepared.newEntry.subEntries[0].enabled).toBe(!result.prepared.originalEntry.subEntries[0].enabled);
    }
  });

  it('reports an error for an unknown entry or apparatus', () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const edition = generate(ctData);
    expect(prepareQuickEdit(ctData, edition, {
      kind: 'toggleSubEntry', apparatusIndex: 0, entryIndex: 100000, subEntryIndex: 0
    })).toHaveProperty('error');
    expect(prepareQuickEdit(ctData, edition, {
      kind: 'addSubEntryToRange', apparatusType: 'nonexistent', mainTextRange: {from: 0, to: 0}, subEntry: newSubEntry
    })).toHaveProperty('error');
  });

  it('adds a sub-entry to the existing entry of a main text range, in any selection order', async () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const edition = generate(ctData);
    const apparatus = edition.apparatuses[0];
    const entryIndex = apparatus.entries.findIndex((e) => e.from !== -1 && e.to !== -1);
    const entry = apparatus.entries[entryIndex];

    const result = prepareQuickEdit(ctData, edition, {
      kind: 'addSubEntryToRange', apparatusType: apparatus.type,
      mainTextRange: {from: entry.to, to: entry.from}, subEntry: newSubEntry
    });
    expect('prepared' in result).toBe(true);
    if (!('prepared' in result)) {
      return;
    }
    expect(result.prepared.newEntry.subEntries).toHaveLength(entry.subEntries.length + 1);

    const originalJson = JSON.stringify(ctData);
    const newState = await new QuickApparatusEditAction(result.prepared).execute({ctData});
    expect(JSON.stringify(ctData)).toBe(originalJson);
    const regenerated = generate(newState.ctData).apparatuses[0].entries
      .find((e) => e.from === entry.from && e.to === entry.to)!;
    expect(regenerated.subEntries).toHaveLength(entry.subEntries.length + 1);
    expect(getPlainText(regenerated.subEntries[regenerated.subEntries.length - 1].fmtText)).toBe('quickword');
  });

  it('creates a new entry for a range without one', async () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const edition = generate(ctData);
    const apparatus = edition.apparatuses[0];
    const tokenIndex = findTokenWithoutEntry(edition);

    const result = prepareQuickEdit(ctData, edition, {
      kind: 'addSubEntryToRange', apparatusType: apparatus.type,
      mainTextRange: {from: tokenIndex, to: tokenIndex}, subEntry: {type: 'omission', text: '', witnesses: [1]}
    });
    expect('prepared' in result).toBe(true);
    if (!('prepared' in result)) {
      return;
    }
    expect(result.prepared.ctRange).toEqual(getCtRangeForMainTextRange(ctData, edition.mainText, {from: tokenIndex, to: tokenIndex}));
    expect(result.prepared.newEntry.subEntries).toHaveLength(1);

    const newState = await new QuickApparatusEditAction(result.prepared).execute({ctData});
    const newEntry = generate(newState.ctData).apparatuses[0].entries
      .find((e) => e.from === tokenIndex && e.to === tokenIndex);
    expect(newEntry).toBeDefined();
    expect(newEntry!.subEntries).toHaveLength(1);
    expect(newEntry!.subEntries[0].keyword).toBe('omission');
  });

  it('rejects an identical sub-entry', async () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const edition = generate(ctData);
    const apparatus = edition.apparatuses[0];
    const tokenIndex = findTokenWithoutEntry(edition);
    const range = {from: tokenIndex, to: tokenIndex};
    const first = prepareQuickEdit(ctData, edition, {
      kind: 'addSubEntryToRange', apparatusType: apparatus.type, mainTextRange: range, subEntry: newSubEntry
    });
    if (!('prepared' in first)) {
      throw new Error('unexpected error');
    }
    const newState = await new QuickApparatusEditAction(first.prepared).execute({ctData});
    const newEdition = generate(newState.ctData);

    const second = prepareQuickEdit(newState.ctData, newEdition, {
      kind: 'addSubEntryToRange', apparatusType: apparatus.type, mainTextRange: range, subEntry: newSubEntry
    });
    expect(second).toEqual({error: IDENTICAL_SUB_ENTRY_ERROR});
  });
});

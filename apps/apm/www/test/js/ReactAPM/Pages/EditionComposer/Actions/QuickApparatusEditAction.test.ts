import {describe, expect, it} from 'vitest';
import {CtDataEditionGenerator} from '@/Edition/EditionGenerator/CtDataEditionGenerator';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {Edition} from '@/Edition/Edition';
import {getCtRangeForEntry} from '@/Edition/ApparatusEntryCustomization';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {
  QuickApparatusEditAction
} from '@/ReactAPM/Pages/EditionComposer/Actions/QuickApparatusEditAction';
import {
  addQuickSubEntry,
  moveSubEntryBackwardOrForward,
  toggleSubEntry
} from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil';
import {createLargeCtData, SMALL_CT_DATA} from '../../../../benchmark/LargeCtDataFixture';

function generate(ctData: CtDataInterface): Edition {
  return new CtDataEditionGenerator({ctData}).generateEdition();
}

async function applyEntryEdit(ctData: CtDataInterface, edition: Edition, entry: ApparatusEntry, newEntry: ApparatusEntry, withOriginal = false): Promise<CtDataInterface> {
  const ctRange = getCtRangeForEntry(ctData, edition.mainText, entry);
  const action = new QuickApparatusEditAction({
    apparatusType: edition.apparatuses[0].type, ctRange, newEntry, description: 'test', originalEntry: withOriginal ? entry : undefined
  });
  return (await action.execute({ctData})).ctData;
}

function findEntryWithAutoSubEntries(edition: Edition): { entry: ApparatusEntry, index: number } {
  const index = edition.apparatuses[0].entries.findIndex((e) => e.subEntries.length >= 2 && e.subEntries.every((se) => se.source === 'auto'));
  expect(index).not.toBe(-1);
  return {entry: edition.apparatuses[0].entries[index], index};
}

describe('QuickApparatusEditAction', () => {
  it('stamps ctGroup metadata on every generated entry of every apparatus', () => {
    const edition = generate(createLargeCtData(SMALL_CT_DATA));
    const criticus = edition.apparatuses[0];
    expect(criticus.entries.every((e) => e.metadata['ctGroup'] !== undefined)).toBe(true);
  });

  it('disables an automatic sub-entry without touching the original state', async () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const originalJson = JSON.stringify(ctData);
    const edition = generate(ctData);
    const {entry, index} = findEntryWithAutoSubEntries(edition);

    const newCtData = await applyEntryEdit(ctData, edition, entry, toggleSubEntry(entry, 0));

    expect(JSON.stringify(ctData)).toBe(originalJson);
    const newEntry = generate(newCtData).apparatuses[0].entries[index];
    expect(newEntry.subEntries[0].enabled).toBe(false);
    expect(newEntry.subEntries[1].enabled).toBe(true);
  });

  it('moves a sub-entry', async () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const edition = generate(ctData);
    const {entry, index} = findEntryWithAutoSubEntries(edition);
    const first = entry.subEntries[0].hashString();

    const newCtData = await applyEntryEdit(ctData, edition, entry, moveSubEntryBackwardOrForward(entry, 0, 'forward'));

    const newEntry = generate(newCtData).apparatuses[0].entries[index];
    expect(newEntry.subEntries[1].hashString()).toBe(first);
  });

  it('adds a custom sub-entry that shows up in the regenerated edition', async () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const edition = generate(ctData);
    const {entry, index} = findEntryWithAutoSubEntries(edition);
    const result = addQuickSubEntry(entry, {type: 'addition', text: 'new  word', witnesses: [0, 1]});
    if ('error' in result) {
      throw new Error(result.error);
    }

    const newCtData = await applyEntryEdit(ctData, edition, entry, result.entry);

    const newEntry = generate(newCtData).apparatuses[0].entries[index];
    expect(newEntry.subEntries).toHaveLength(entry.subEntries.length + 1);
    const added = newEntry.subEntries[newEntry.subEntries.length - 1];
    expect(added.source).toBe('user');
    expect(added.keyword).toBe('addition');
    expect(added.witnessData.map((w) => [w.witnessIndex, w.hand])).toEqual([[0, 0], [1, 0]]);
  });

  it('leaves no residue when a sub-entry is disabled and enabled again', async () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const originalJson = JSON.stringify(ctData.customApparatuses);
    const edition = generate(ctData);
    const {entry, index} = findEntryWithAutoSubEntries(edition);

    const disabledCtData = await applyEntryEdit(ctData, edition, entry, toggleSubEntry(entry, 0), true);
    expect(JSON.stringify(disabledCtData.customApparatuses)).not.toBe(originalJson);

    const edition2 = generate(disabledCtData);
    const entry2 = edition2.apparatuses[0].entries[index];
    expect(entry2.subEntries[0].enabled).toBe(false);
    const enabledCtData = await applyEntryEdit(disabledCtData, edition2, entry2, toggleSubEntry(entry2, 0), true);

    expect(JSON.stringify(enabledCtData.customApparatuses)).toBe(originalJson);
  });

  it('leaves no residue when a sub-entry is moved forward and back', async () => {
    const ctData = createLargeCtData(SMALL_CT_DATA);
    const originalJson = JSON.stringify(ctData.customApparatuses);
    const edition = generate(ctData);
    const {entry, index} = findEntryWithAutoSubEntries(edition);

    const movedCtData = await applyEntryEdit(ctData, edition, entry, moveSubEntryBackwardOrForward(entry, 0, 'forward'), true);
    expect(JSON.stringify(movedCtData.customApparatuses)).not.toBe(originalJson);

    const edition2 = generate(movedCtData);
    const entry2 = edition2.apparatuses[0].entries[index];
    const backCtData = await applyEntryEdit(movedCtData, edition2, entry2, moveSubEntryBackwardOrForward(entry2, 1, 'backward'), true);

    expect(JSON.stringify(backCtData.customApparatuses)).toBe(originalJson);
  });

  it('has the description given in the parameters', () => {
    const action = new QuickApparatusEditAction({
      apparatusType: 'criticus', ctRange: {from: 0, to: 0}, newEntry: new ApparatusEntry(), description: 'my description'
    });
    expect(action.description()).toBe('my description');
  });
});

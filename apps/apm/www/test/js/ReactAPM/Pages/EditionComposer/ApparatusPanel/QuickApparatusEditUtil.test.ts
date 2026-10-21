import {describe, expect, it} from 'vitest';
import {fromString} from '@thomas-inst/fmt-text';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry';
import {WitnessDataItem} from '@/Edition/WitnessDataItem';
import * as SubEntryType from '@/Edition/SubEntryType';
import {
  addQuickSubEntry,
  applyQuickEdit,
  findIdenticalSubEntry,
  IDENTICAL_SUB_ENTRY_ERROR,
  moveSubEntryBackwardOrForward,
  toggleSubEntry
} from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil';

function subEntry(type: string, source: string, text: string, witnesses: number[], position: number, keyword = ''): ApparatusSubEntry {
  const se = new ApparatusSubEntry();
  se.type = type;
  se.source = source;
  se.fmtText = fromString(text);
  se.keyword = keyword;
  se.position = position;
  se.witnessData = witnesses.map((w) => new WitnessDataItem().setWitnessIndex(w).setHand(0));
  return se;
}

function buildEntry(): ApparatusEntry {
  const entry = new ApparatusEntry();
  entry.subEntries = [
    subEntry(SubEntryType.VARIANT, 'auto', 'foo', [1, 2], 0),
    subEntry(SubEntryType.OMISSION, 'auto', '', [3], 1),
    subEntry(SubEntryType.FULL_CUSTOM, 'user', 'bar', [4], 2, ''),
    subEntry(SubEntryType.FULL_CUSTOM, 'user', '', [5], 3, 'addition'),
  ];
  entry.subEntries[3].enabled = false;
  return entry;
}

describe('findIdenticalSubEntry', () => {
  it('finds auto, custom and disabled sub-entries regardless of witness order and spacing', () => {
    const entry = buildEntry();
    expect(findIdenticalSubEntry(entry, {type: 'variant', text: ' foo ', witnesses: [2, 1]})).toBe(0);
    expect(findIdenticalSubEntry(entry, {type: 'omission', text: 'ignored', witnesses: [3]})).toBe(1);
    expect(findIdenticalSubEntry(entry, {type: 'variant', text: 'bar', witnesses: [4]})).toBe(2);
  });

  it('treats a custom sub-entry with an addition keyword as an addition', () => {
    const entry = buildEntry();
    entry.subEntries[3].fmtText = fromString('baz');
    expect(findIdenticalSubEntry(entry, {type: 'addition', text: 'baz', witnesses: [5]})).toBe(3);
    expect(findIdenticalSubEntry(entry, {type: 'variant', text: 'baz', witnesses: [5]})).toBe(-1);
  });

  it('does not match when only the witnesses or the text differ, or for a null entry', () => {
    const entry = buildEntry();
    expect(findIdenticalSubEntry(entry, {type: 'variant', text: 'foo', witnesses: [1]})).toBe(-1);
    expect(findIdenticalSubEntry(entry, {type: 'variant', text: 'fo', witnesses: [1, 2]})).toBe(-1);
    expect(findIdenticalSubEntry(null, {type: 'variant', text: 'foo', witnesses: [1, 2]})).toBe(-1);
  });
});

describe('quick operations', () => {
  it('toggles a sub-entry on a copy', () => {
    const entry = buildEntry();
    const result = toggleSubEntry(entry, 3);
    expect(result.subEntries[3].enabled).toBe(true);
    expect(entry.subEntries[3].enabled).toBe(false);
    expect(toggleSubEntry(entry, 0).subEntries[0].enabled).toBe(false);
  });

  it('moves a sub-entry and rewrites all positions', () => {
    const entry = buildEntry();
    const result = moveSubEntryBackwardOrForward(entry, 2, 'backward');
    expect(result.subEntries[1].keyword).toBe('');
    expect(result.subEntries[1].type).toBe(SubEntryType.FULL_CUSTOM);
    expect(result.subEntries.map((se) => se.position)).toEqual([0, 1, 2, 3]);
    expect(moveSubEntryBackwardOrForward(entry, 0, 'backward').subEntries.map((se) => se.type))
      .toEqual(entry.subEntries.map((se) => se.type));
  });

  it('adds a custom sub-entry at the end', () => {
    const entry = buildEntry();
    const result = addQuickSubEntry(entry, {type: 'omission', text: 'x', witnesses: [7, 7, 8]});
    if ('error' in result) {
      throw new Error(result.error);
    }
    const added = result.entry.subEntries[4];
    expect(entry.subEntries).toHaveLength(4);
    expect(added).toMatchObject({type: SubEntryType.FULL_CUSTOM, source: 'user', keyword: 'omission', position: 4, enabled: true});
    expect(added.fmtText).toEqual([]);
    expect(added.witnessData.map((w) => [w.witnessIndex, w.hand])).toEqual([[7, 0], [8, 0]]);
  });

  it('adds the sub-entry last even if existing sub-entries have no position', () => {
    const entry = buildEntry();
    entry.subEntries.forEach((se) => {
      se.position = -1;
    });
    const result = addQuickSubEntry(entry, {type: 'variant', text: 'new', witnesses: [9]});
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.entry.subEntries.map((se) => se.position)).toEqual([0, 1, 2, 3, 4]);
    const ordered = ApparatusEntry.orderSubEntries(result.entry);
    expect(ordered.subEntries[4].witnessData[0].witnessIndex).toBe(9);
  });

  it('rejects identical, empty and witness-less sub-entries', () => {
    const entry = buildEntry();
    expect(addQuickSubEntry(entry, {type: 'variant', text: 'foo', witnesses: [1, 2]})).toEqual({error: IDENTICAL_SUB_ENTRY_ERROR});
    expect(addQuickSubEntry(entry, {type: 'variant', text: '  ', witnesses: [1]})).toHaveProperty('error');
    expect(addQuickSubEntry(entry, {type: 'variant', text: 'foo', witnesses: []})).toHaveProperty('error');
    // same reading with different witnesses is accepted
    expect(addQuickSubEntry(entry, {type: 'variant', text: 'foo', witnesses: [9]})).toHaveProperty('entry');
  });

  it('dispatches edits', () => {
    const entry = buildEntry();
    const result = applyQuickEdit(entry, {kind: 'toggleSubEntry', apparatusIndex: 0, entryIndex: 0, subEntryIndex: 0});
    expect('entry' in result && result.entry.subEntries[0].enabled).toBe(false);
  });
});

import {describe, expect, it} from 'vitest';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry';
import * as SubEntryType from '@/Edition/SubEntryType';
import {
  addCustomSubEntry,
  deleteSubEntry,
  getLemmaGroupToggleOption,
  getLemmaGroupValue,
  moveSubEntry,
  setLemmaType,
  setSubEntryEnabled
} from '@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/ApparatusEntryEditorUtil';

function entryWithSubEntries(n: number): ApparatusEntry {
  const entry = new ApparatusEntry();
  for (let i = 0; i < n; i++) {
    const subEntry = new ApparatusSubEntry();
    subEntry.type = SubEntryType.VARIANT;
    subEntry.source = 'auto';
    subEntry.fmtText = [{type: 'text', text: `v${i}`}] as any;
    subEntry.position = i;
    entry.subEntries.push(subEntry);
  }
  return entry;
}

const texts = (entry: ApparatusEntry) => entry.subEntries.map(s => (s.fmtText as any)[0]?.text);

describe('ApparatusEntryEditorUtil', () => {
  it('moves sub-entries and rewrites positions without changing the original', () => {
    const entry = entryWithSubEntries(3);
    const moved = moveSubEntry(entry, 0, 'down');
    expect(texts(moved)).toEqual(['v1', 'v0', 'v2']);
    expect(moved.subEntries.map(s => s.position)).toEqual([0, 1, 2]);
    expect(texts(entry)).toEqual(['v0', 'v1', 'v2']);
  });

  it('ignores moves beyond the boundaries', () => {
    const entry = entryWithSubEntries(2);
    expect(texts(moveSubEntry(entry, 0, 'up'))).toEqual(['v0', 'v1']);
    expect(texts(moveSubEntry(entry, 1, 'down'))).toEqual(['v0', 'v1']);
  });

  it('adds a custom sub-entry at the end', () => {
    const added = addCustomSubEntry(entryWithSubEntries(2));
    expect(added.subEntries).toHaveLength(3);
    expect(added.subEntries[2]).toMatchObject({type: SubEntryType.FULL_CUSTOM, source: 'user', position: 2});
  });

  it('deletes a sub-entry and renumbers positions', () => {
    const deleted = deleteSubEntry(entryWithSubEntries(3), 1);
    expect(texts(deleted)).toEqual(['v0', 'v2']);
    expect(deleted.subEntries.map(s => s.position)).toEqual([0, 1]);
  });

  it('toggles the enabled state of one sub-entry only', () => {
    const entry = entryWithSubEntries(2);
    const changed = setSubEntryEnabled(entry, 1, false);
    expect(changed.subEntries.map(s => s.enabled)).toEqual([true, false]);
    expect(entry.subEntries[1].enabled).toBe(true);
  });

  it('maps lemma group values to toggle options and back', () => {
    const names = ['auto', 'ante', 'post', 'custom'];
    expect(getLemmaGroupToggleOption('', names)).toBe('auto');
    expect(getLemmaGroupToggleOption('ante', names)).toBe('ante');
    expect(getLemmaGroupToggleOption('something', names)).toBe('custom');
    expect(getLemmaGroupValue('auto', 'x')).toBe('');
    expect(getLemmaGroupValue('post', 'x')).toBe('post');
    expect(getLemmaGroupValue('custom', '  a   b ')).toBe('a b');
  });

  it('sets the lemma type and clears custom text for other types', () => {
    const entry = new ApparatusEntry();
    const custom = setLemmaType(entry, 'custom', ' my  lemma ');
    expect(custom.lemmaType).toBe('custom');
    expect(custom.customLemmaText).toBe('my lemma');
    const dash = setLemmaType(custom, 'dash', 'ignored');
    expect(dash.lemmaType).toBe('dash');
    expect(dash.customLemmaText).toBe('');
  });
});

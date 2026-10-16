import {describe, expect, it} from 'vitest';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {ApparatusSubEntry} from '@/Edition/ApparatusSubEntry';
import * as SubEntryType from '@/Edition/SubEntryType';
import {
  customEntryFromApparatusEntry,
  getCtRangeForEntry
} from '@/Edition/ApparatusEntryCustomization';
import {WitnessDataItem} from '@/Edition/WitnessDataItem';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {MainTextToken} from '@/Edition/MainTextToken';

function buildEntry(): ApparatusEntry {
  const entry = new ApparatusEntry();
  entry.from = 1;
  entry.to = 2;
  entry.preLemma = 'ante';
  entry.separator = 'colon';
  entry.tags = ['revise'];

  const auto = new ApparatusSubEntry();
  auto.type = SubEntryType.VARIANT;
  auto.source = 'auto';
  auto.fmtText = [{type: 'text', text: 'foo'}] as any;
  auto.witnessData = [new WitnessDataItem().setWitnessIndex(1).setHand(0)];
  auto.enabled = false;
  auto.position = 0;

  const custom = new ApparatusSubEntry();
  custom.type = SubEntryType.FULL_CUSTOM;
  custom.source = 'user';
  custom.keyword = 'omission';
  custom.witnessData = [new WitnessDataItem().setWitnessIndex(2).setHand(1)];
  custom.position = 1;
  entry.subEntries = [auto, custom];
  return entry;
}

describe('customEntryFromApparatusEntry', () => {
  it('converts auto sub-entries to hash references and user sub-entries to full custom ones', () => {
    const entry = buildEntry();
    const custom = customEntryFromApparatusEntry(entry, {from: 3, to: 5});
    expect(custom.from).toBe(3);
    expect(custom.to).toBe(5);
    expect(custom.lemma).toBe('');
    expect(custom.preLemma).toBe('ante');
    expect(custom.separator).toBe('colon');
    expect(custom.tags).toEqual(['revise']);
    expect(custom.subEntries).toHaveLength(2);
    expect(custom.subEntries[0]).toMatchObject({
      type: 'auto', enabled: false, position: 0, hash: entry.subEntries[0].hashString()
    });
    expect(custom.subEntries[1]).toMatchObject({
      type: 'fullCustom', enabled: true, position: 1, keyword: 'omission'
    });
  });

  it('maps lemma types to the custom lemma value', () => {
    const entry = buildEntry();
    expect(customEntryFromApparatusEntry(entry, {from: 0, to: 0}).lemma).toBe('');
    entry.lemmaType = 'dash';
    expect(customEntryFromApparatusEntry(entry, {from: 0, to: 0}).lemma).toBe('dash');
    entry.lemmaType = 'custom';
    entry.customLemmaText = 'my lemma';
    expect(customEntryFromApparatusEntry(entry, {from: 0, to: 0}).lemma).toBe('my lemma');
  });
});

describe('getCtRangeForEntry', () => {
  it('falls back to the ctGroup metadata when the main text indexes are not valid', () => {
    const entry = new ApparatusEntry();
    entry.metadata['ctGroup'] = {from: 4, to: 6};
    expect(getCtRangeForEntry({} as CtDataInterface, [] as MainTextToken[], entry)).toEqual({from: 4, to: 6});
  });

  it('throws if there is no way to find the range', () => {
    expect(() => getCtRangeForEntry({} as CtDataInterface, [], new ApparatusEntry())).toThrow();
  });
});

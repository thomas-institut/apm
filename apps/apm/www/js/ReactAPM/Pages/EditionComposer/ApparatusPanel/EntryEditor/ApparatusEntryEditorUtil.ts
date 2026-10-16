import {CompactFmtText, fromCompactFmtText, getPlainText} from "@thomas-inst/fmt-text";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {ApparatusSubEntry} from "@/Edition/ApparatusSubEntry";
import * as SubEntryType from "@/Edition/SubEntryType";
import {WitnessDataItem} from "@/Edition/WitnessDataItem";
import {LemmaType} from "@/Edition/EditionInterface";
import {removeExtraWhiteSpace} from "@/toolbox/Util";

/**
 * Returns the toggle option that corresponds to the value of a pre-lemma, post-lemma
 * or separator field.
 */
export function getLemmaGroupToggleOption(value: CompactFmtText, optionNames: string[]): string {
  if (value === '') {
    return 'auto';
  }
  const stringVal = getPlainText(fromCompactFmtText(value));
  return optionNames.includes(stringVal) ? stringVal : 'custom';
}

/**
 * Returns the value to store in a pre-lemma, post-lemma or separator field
 * for the given toggle option and custom text.
 */
export function getLemmaGroupValue(option: string, customText: string): string {
  switch (option) {
    case 'auto':
      return '';

    case 'custom':
      return removeExtraWhiteSpace(customText);

    default:
      return option;
  }
}

export function getPlainLemmaGroupText(value: CompactFmtText): string {
  return value === '' ? '' : getPlainText(fromCompactFmtText(value));
}

export type LemmaGroupVariable = 'preLemma' | 'postLemma' | 'separator';

export function setLemmaGroupVariable(entry: ApparatusEntry, variable: LemmaGroupVariable, value: string): ApparatusEntry {
  const newEntry = ApparatusEntry.clone(entry);
  newEntry[variable] = value;
  return newEntry;
}

export function setLemmaType(entry: ApparatusEntry, lemmaType: LemmaType, customLemmaText: string): ApparatusEntry {
  const newEntry = ApparatusEntry.clone(entry);
  newEntry.lemmaType = lemmaType;
  newEntry.customLemmaText = lemmaType === 'custom' ? removeExtraWhiteSpace(customLemmaText) : '';
  return newEntry;
}

export function setTags(entry: ApparatusEntry, tags: string[]): ApparatusEntry {
  const newEntry = ApparatusEntry.clone(entry);
  newEntry.tags = [...tags];
  return newEntry;
}

function updateSubEntry(entry: ApparatusEntry, index: number, update: (subEntry: ApparatusSubEntry) => void): ApparatusEntry {
  const newEntry = ApparatusEntry.clone(entry);
  if (index < 0 || index >= newEntry.subEntries.length) {
    return newEntry;
  }
  update(newEntry.subEntries[index]);
  return newEntry;
}

export function setSubEntryEnabled(entry: ApparatusEntry, index: number, enabled: boolean): ApparatusEntry {
  return updateSubEntry(entry, index, (subEntry) => {
    subEntry.enabled = enabled;
  });
}

export function setSubEntryKeyword(entry: ApparatusEntry, index: number, keyword: string): ApparatusEntry {
  return updateSubEntry(entry, index, (subEntry) => {
    subEntry.keyword = keyword;
  });
}

export function setSubEntryFmtText(entry: ApparatusEntry, index: number, fmtText: ApparatusSubEntry['fmtText']): ApparatusEntry {
  return updateSubEntry(entry, index, (subEntry) => {
    subEntry.fmtText = fmtText;
  });
}

export function setSubEntryWitnessData(entry: ApparatusEntry, index: number, witnessData: WitnessDataItem[]): ApparatusEntry {
  return updateSubEntry(entry, index, (subEntry) => {
    subEntry.witnessData = witnessData;
  });
}

/**
 * Appends a new, empty custom sub-entry
 */
export function addCustomSubEntry(entry: ApparatusEntry): ApparatusEntry {
  const newEntry = ApparatusEntry.clone(entry);
  const newSubEntry = new ApparatusSubEntry();
  newSubEntry.type = SubEntryType.FULL_CUSTOM;
  newSubEntry.source = 'user';
  newSubEntry.position = newEntry.subEntries.length;
  newEntry.subEntries.push(newSubEntry);
  return newEntry;
}

/**
 * Moves a sub-entry one place backward or forward, and rewrites the position of all sub-entries
 */
export function moveSubEntry(entry: ApparatusEntry, index: number, direction: 'up' | 'down'): ApparatusEntry {
  const newEntry = ApparatusEntry.clone(entry);
  const targetIndex = index + (direction === 'up' ? -1 : 1);
  if (index < 0 || index >= newEntry.subEntries.length || targetIndex < 0 || targetIndex >= newEntry.subEntries.length) {
    return newEntry;
  }
  const subEntries = newEntry.subEntries;
  [subEntries[index], subEntries[targetIndex]] = [subEntries[targetIndex], subEntries[index]];
  subEntries.forEach((subEntry, i) => {
    subEntry.position = i;
  });
  return newEntry;
}

export function deleteSubEntry(entry: ApparatusEntry, index: number): ApparatusEntry {
  const newEntry = ApparatusEntry.clone(entry);
  newEntry.subEntries = newEntry.subEntries.filter((_subEntry, i) => i !== index);
  newEntry.subEntries.forEach((subEntry, i) => {
    subEntry.position = i;
  });
  return newEntry;
}

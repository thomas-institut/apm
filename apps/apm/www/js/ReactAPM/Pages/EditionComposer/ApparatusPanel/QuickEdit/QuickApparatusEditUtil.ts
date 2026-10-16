import {fromString, getPlainText} from "@thomas-inst/fmt-text";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {ApparatusSubEntry} from "@/Edition/ApparatusSubEntry";
import * as SubEntryType from "@/Edition/SubEntryType";
import * as SubEntrySource from "@/Edition/SubEntrySource";
import {WitnessDataItem} from "@/Edition/WitnessDataItem";
import {removeExtraWhiteSpace} from "@/toolbox/Util";
import {
  moveSubEntry,
  setSubEntryEnabled
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/ApparatusEntryEditorUtil";

export type QuickSubEntryType = 'variant' | 'omission' | 'addition';

export interface QuickSubEntryData {
  type: QuickSubEntryType;
  /** Ignored for omissions */
  text: string;
  /** Witness indices; always hand 0. Sigla groups must be expanded by the caller */
  witnesses: number[];
}

export type QuickEditResult = { entry: ApparatusEntry } | { error: string };

export const IDENTICAL_SUB_ENTRY_ERROR = 'Identical to an existing sub-entry';

export type QuickApparatusEdit =
  | { kind: 'toggleSubEntry'; apparatusIndex: number; entryIndex: number; subEntryIndex: number }
  | {
  kind: 'moveSubEntry';
  apparatusIndex: number;
  entryIndex: number;
  subEntryIndex: number;
  direction: 'backward' | 'forward'
}
  | { kind: 'addSubEntry'; apparatusIndex: number; entryIndex: number; subEntry: QuickSubEntryData };

function normalizedText(text: string): string {
  return removeExtraWhiteSpace(text).trim();
}

/**
 * Returns the effective type of a sub-entry: a full custom sub-entry takes its type from its keyword
 */
function getEffectiveType(subEntry: ApparatusSubEntry): string {
  if (subEntry.type === SubEntryType.FULL_CUSTOM) {
    return subEntry.keyword === '' ? SubEntryType.VARIANT : subEntry.keyword;
  }
  return subEntry.type;
}

function getWitnessSetKey(witnessData: { witnessIndex: number, hand: number }[]): string {
  return witnessData.map((w) => `${w.witnessIndex}:${w.hand}`).sort().join('_');
}

/**
 * Returns the index of a sub-entry of `entry` identical to `data`, or -1.
 * Automatic and custom, enabled and disabled sub-entries are all considered.
 * Two sub-entries are identical when they have the same effective type, the same text
 * (ignored for omissions, spacing ignored) and the same set of witnesses and hands.
 */
export function findIdenticalSubEntry(entry: ApparatusEntry | null, data: QuickSubEntryData): number {
  if (entry === null) {
    return -1;
  }
  const text = data.type === 'omission' ? '' : normalizedText(data.text);
  const witnessKey = getWitnessSetKey(data.witnesses.map((w) => ({witnessIndex: w, hand: 0})));
  return entry.subEntries.findIndex((subEntry) => {
    if (getEffectiveType(subEntry) !== data.type) {
      return false;
    }
    if (data.type !== 'omission' && normalizedText(getPlainText(subEntry.fmtText)) !== text) {
      return false;
    }
    return getWitnessSetKey(subEntry.witnessData) === witnessKey;
  });
}

export function toggleSubEntry(entry: ApparatusEntry, subEntryIndex: number): ApparatusEntry {
  const subEntry = entry.subEntries[subEntryIndex];
  if (subEntry === undefined) {
    return ApparatusEntry.clone(entry);
  }
  return setSubEntryEnabled(entry, subEntryIndex, !subEntry.enabled);
}

export function moveSubEntryBackwardOrForward(entry: ApparatusEntry, subEntryIndex: number, direction: 'backward' | 'forward'): ApparatusEntry {
  return moveSubEntry(entry, subEntryIndex, direction === 'backward' ? 'up' : 'down');
}

/**
 * Appends a new user sub-entry to a copy of the entry, or returns an error
 * if the data is invalid or identical to an existing sub-entry.
 */
export function addQuickSubEntry(entry: ApparatusEntry, data: QuickSubEntryData): QuickEditResult {
  if (data.witnesses.length === 0) {
    return {error: 'No witnesses selected'};
  }
  if (data.type !== 'omission' && normalizedText(data.text) === '') {
    return {error: 'Empty text'};
  }
  if (findIdenticalSubEntry(entry, data) !== -1) {
    return {error: IDENTICAL_SUB_ENTRY_ERROR};
  }
  const newEntry = ApparatusEntry.clone(entry);
  const subEntry = new ApparatusSubEntry();
  subEntry.type = SubEntryType.FULL_CUSTOM;
  subEntry.source = SubEntrySource.USER;
  subEntry.keyword = data.type === 'variant' ? '' : data.type;
  subEntry.fmtText = data.type === 'omission' ? [] : fromString(normalizedText(data.text));
  subEntry.witnessData = [...new Set(data.witnesses)].map((w) => new WitnessDataItem().setWitnessIndex(w).setHand(0));
  subEntry.position = newEntry.subEntries.length;
  newEntry.subEntries.push(subEntry);
  return {entry: newEntry};
}

/**
 * Applies an edit to a copy of the entry
 */
export function applyQuickEdit(entry: ApparatusEntry, edit: QuickApparatusEdit): QuickEditResult {
  switch (edit.kind) {
    case 'toggleSubEntry':
      return {entry: toggleSubEntry(entry, edit.subEntryIndex)};

    case 'moveSubEntry':
      return {entry: moveSubEntryBackwardOrForward(entry, edit.subEntryIndex, edit.direction)};

    case 'addSubEntry':
      return addQuickSubEntry(entry, edit.subEntry);
  }
}

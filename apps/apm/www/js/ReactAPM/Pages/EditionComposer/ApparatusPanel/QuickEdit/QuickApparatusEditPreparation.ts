import {Edition} from "@/Edition/Edition";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {CtDataInterface} from "@/CtData/CtDataInterface";
import {
  CtRange,
  getCtRangeForEntry,
  getCtRangeForMainTextRange
} from "@/Edition/ApparatusEntryCustomization";
import {
  applyQuickEdit,
  buildEmptyEntryForRange,
  findEntryIndexForCtRange,
  QuickApparatusEdit
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil";

export interface PreparedQuickEdit {
  apparatusType: string;
  ctRange: CtRange;
  originalEntry: ApparatusEntry;
  newEntry: ApparatusEntry;
  description: string;
}

export type QuickEditPreparationResult = { prepared: PreparedQuickEdit } | { error: string };

function getLemmaDescription(entry: ApparatusEntry): string {
  return entry.lemmaType === 'custom' ? entry.customLemmaText : entry.mainTextWords.join(' ');
}

/**
 * Resolves a quick edit against the displayed edition: finds (or builds, for a new range) the target entry,
 * applies the operation and returns everything the history action needs, or an error message.
 */
export function prepareQuickEdit(ctData: CtDataInterface, edition: Edition, edit: QuickApparatusEdit): QuickEditPreparationResult {
  try {
    let apparatusType: string;
    let originalEntry: ApparatusEntry;
    let ctRange: CtRange;

    if (edit.kind === 'addSubEntryToRange') {
      const apparatus = edition.apparatuses.find((a) => a.type === edit.apparatusType);
      if (apparatus === undefined) {
        return {error: `Unknown apparatus '${edit.apparatusType}'`};
      }
      apparatusType = apparatus.type;
      ctRange = getCtRangeForMainTextRange(ctData, edition.mainText, edit.mainTextRange);
      const entryIndex = findEntryIndexForCtRange(ctData, edition.mainText, apparatus, ctRange);
      originalEntry = entryIndex !== -1 ? apparatus.entries[entryIndex] :
        buildEmptyEntryForRange(edition.mainText, edit.mainTextRange, ctRange);
    } else {
      const apparatus = edition.apparatuses[edit.apparatusIndex];
      const entry = apparatus?.entries[edit.entryIndex];
      if (apparatus === undefined || entry === undefined) {
        return {error: 'The apparatus entry does not exist anymore'};
      }
      apparatusType = apparatus.type;
      originalEntry = entry;
      ctRange = getCtRangeForEntry(ctData, edition.mainText, entry);
    }

    const result = applyQuickEdit(originalEntry, edit);
    if ('error' in result) {
      return {error: result.error};
    }

    const lemma = getLemmaDescription(originalEntry);
    let description: string;
    switch (edit.kind) {
      case 'toggleSubEntry':
        description = `${originalEntry.subEntries[edit.subEntryIndex]?.enabled ? 'Disable' : 'Enable'} sub-entry in '${lemma}'`;
        break;
      case 'moveSubEntry':
        description = `Move sub-entry ${edit.direction} in '${lemma}'`;
        break;
      default:
        description = `Add ${edit.subEntry.type} to '${lemma}'`;
    }
    return {prepared: {apparatusType, ctRange, originalEntry, newEntry: result.entry, description}};
  } catch (e) {
    return {error: e instanceof Error ? e.message : String(e)};
  }
}

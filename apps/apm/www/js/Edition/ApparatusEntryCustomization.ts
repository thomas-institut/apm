import {ApparatusEntry, NATURAL_AUTO_SUB_ENTRIES_METADATA_KEY} from "@/Edition/ApparatusEntry";
import {ApparatusSubEntry} from "@/Edition/ApparatusSubEntry";
import * as SubEntrySource from "@/Edition/SubEntrySource";
import {
  CtDataInterface,
  CUSTOM_APPARATUS_SUB_ENTRY_TYPE_AUTO,
  CUSTOM_APPARATUS_SUB_ENTRY_TYPE_FULL_CUSTOM,
  CustomApparatusEntryInterface,
  CustomApparatusSubEntryInterface
} from "@/CtData/CtDataInterface";
import {MainTextToken} from "@/Edition/MainTextToken";
import {CtData} from "@/CtData/CtData";

export interface CtRange {
  from: number;
  to: number;
}

/**
 * Converts an apparatus entry as displayed (or as edited by the user) into the custom entry
 * that CtData stores. The ctRange is the range of collation table columns the entry refers to.
 */
export function customEntryFromApparatusEntry(entry: ApparatusEntry, ctRange: CtRange): CustomApparatusEntryInterface {
  let customLemma: string;
  switch (entry.lemmaType) {
    case 'auto':
      customLemma = '';
      break;

    case 'custom':
      customLemma = entry.customLemmaText ?? '';
      break;

    default:
      customLemma = entry.lemmaType;
  }

  return {
    from: ctRange.from,
    to: ctRange.to,
    preLemma: entry.preLemma,
    lemma: customLemma,
    postLemma: entry.postLemma,
    separator: entry.separator,
    tags: [...entry.tags],
    subEntries: entry.subEntries.map((subEntry): CustomApparatusSubEntryInterface => {
      if (subEntry.source === SubEntrySource.AUTO) {
        // build a temporary sub entry in order to get a valid hash
        const se = new ApparatusSubEntry();
        se.fmtText = subEntry.fmtText;
        se.source = subEntry.source;
        se.type = subEntry.type;
        se.witnessData = subEntry.witnessData;
        se.position = subEntry.position;
        se.keyword = subEntry.keyword;
        se.tags = [...subEntry.tags];
        return {
          type: CUSTOM_APPARATUS_SUB_ENTRY_TYPE_AUTO,
          enabled: subEntry.enabled,
          position: subEntry.position,
          tags: [...subEntry.tags],
          hash: se.hashString()
        };
      }
      return {
        type: CUSTOM_APPARATUS_SUB_ENTRY_TYPE_FULL_CUSTOM,
        enabled: subEntry.enabled,
        position: subEntry.position,
        fmtText: subEntry.fmtText,
        witnessData: subEntry.witnessData,
        keyword: subEntry.keyword,
        tags: [...subEntry.tags],
      };
    })
  };
}

/**
 * Returns the hashes of the automatic sub-entries of an entry in their natural order: the one recorded
 * by the edition generator if the entry has customizations or, for an entry without them, the displayed order.
 */
export function getNaturalAutoSubEntryHashes(entry: ApparatusEntry, originalEntry?: ApparatusEntry): string[] | null {
  const recorded = entry.metadata[NATURAL_AUTO_SUB_ENTRIES_METADATA_KEY];
  if (Array.isArray(recorded)) {
    return recorded as string[];
  }
  if (originalEntry === undefined) {
    return null;
  }
  const originalRecorded = originalEntry.metadata[NATURAL_AUTO_SUB_ENTRIES_METADATA_KEY];
  if (Array.isArray(originalRecorded)) {
    return originalRecorded as string[];
  }
  return originalEntry.subEntries.filter((se) => se.source === SubEntrySource.AUTO).map((se) => se.hashString());
}

/**
 * Removes from a custom entry the customizations of automatic sub-entries that change nothing:
 * when every automatic sub-entry is enabled, has no tags and sits in its natural position,
 * all of them are dropped, so that e.g. disabling and re-enabling a sub-entry leaves no residue in CtData.
 *
 * The entry is returned unchanged if the natural order is unknown or if any automatic sub-entry
 * is really customized (partial removal could change the sub-entries' order).
 */
export function normalizeCustomEntry(customEntry: CustomApparatusEntryInterface, naturalAutoHashes: string[] | null): CustomApparatusEntryInterface {
  if (naturalAutoHashes === null) {
    return customEntry;
  }
  const autoSubEntries = customEntry.subEntries.filter((se) => se.type === CUSTOM_APPARATUS_SUB_ENTRY_TYPE_AUTO);
  if (autoSubEntries.length === 0) {
    return customEntry;
  }
  const allDefault = autoSubEntries.every((se) => {
    return se.hash !== undefined
      && se.enabled
      && se.tags.length === 0
      && se.position === naturalAutoHashes.indexOf(se.hash);
  });
  if (!allDefault) {
    return customEntry;
  }
  return {
    ...customEntry,
    subEntries: customEntry.subEntries.filter((se) => se.type !== CUSTOM_APPARATUS_SUB_ENTRY_TYPE_AUTO)
  };
}

/**
 * Returns the collation table range of an entry: computed from the main text if the entry
 * has valid main text indexes, otherwise taken from the entry's metadata.
 */
export function getCtRangeForEntry(ctData: CtDataInterface, mainText: MainTextToken[], entry: ApparatusEntry): CtRange {
  const ctGroup = entry.metadata['ctGroup'] as CtRange | undefined;
  const getCtIndex = (mainTextIndex: number, fallback: number | undefined): number => {
    if (mainTextIndex !== -1 && mainText[mainTextIndex] !== undefined) {
      return CtData.getCtIndexForEditionWitnessTokenIndex(ctData, mainText[mainTextIndex].editionWitnessTokenIndex);
    }
    if (fallback === undefined) {
      throw new Error(`Undefined collation table indexes for apparatus entry`);
    }
    return fallback;
  };
  return {
    from: getCtIndex(entry.from, ctGroup?.from),
    to: getCtIndex(entry.to, ctGroup?.to)
  };
}

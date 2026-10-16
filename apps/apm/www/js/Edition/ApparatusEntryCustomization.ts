import {ApparatusEntry} from "@/Edition/ApparatusEntry";
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

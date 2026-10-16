import {
  CtDataInterface,
  CustomApparatusEntryInterface,
  FullTxItemInterface,
  WitnessInterface,
  WitnessTokenInterface
} from '@/CtData/CtDataInterface';
import {fromString} from '@thomas-inst/fmt-text';
import {deepCopy} from '@/toolbox/Util';

export interface LargeCtDataOptions {
  /** Number of witnesses, the first one is the edition (base) witness */
  numWitnesses: number;
  /** Number of collation table columns */
  numColumns: number;
  /** Probability that a witness reads differently from the base in a given column */
  variantRate: number;
  /** Probability that a witness has no text in a given column */
  omissionRate: number;
  /** Number of columns grouped together with the following column */
  groupRate: number;
  /** Number of custom entries in the criticus custom apparatus */
  numCustomEntries: number;
  /** Seed of the pseudo-random generator, fixtures are deterministic */
  seed: number;
}

export const SMALL_CT_DATA: LargeCtDataOptions = {
  numWitnesses: 5, numColumns: 500, variantRate: 0.15, omissionRate: 0.03, groupRate: 0.05,
  numCustomEntries: 20, seed: 1
};
export const MEDIUM_CT_DATA: LargeCtDataOptions = {
  numWitnesses: 8, numColumns: 2000, variantRate: 0.15, omissionRate: 0.03, groupRate: 0.05,
  numCustomEntries: 80, seed: 2
};
export const LARGE_CT_DATA: LargeCtDataOptions = {
  numWitnesses: 12, numColumns: 6000, variantRate: 0.15, omissionRate: 0.03, groupRate: 0.05,
  numCustomEntries: 250, seed: 3
};

/** mulberry32: small deterministic PRNG */
function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wordForColumn(column: number, variant: number): string {
  return `w${column.toString(36)}${variant === 0 ? '' : 'v' + variant}`;
}

/**
 * Builds a synthetic but realistic CtData structure: word tokens, a collation matrix with variants,
 * omissions and grouped columns, full transcription items (to make the structure as heavy as a real one)
 * and a number of custom apparatus entries.
 */
export function createLargeCtData(options: LargeCtDataOptions): CtDataInterface {
  const random = createRandom(options.seed);
  const witnesses: WitnessInterface[] = [];
  const collationMatrix: number[][] = [];

  for (let w = 0; w < options.numWitnesses; w++) {
    const tokens: WitnessTokenInterface[] = [];
    const items: FullTxItemInterface[] = [];
    const row: number[] = [];
    for (let col = 0; col < options.numColumns; col++) {
      const r = random();
      if (w !== 0 && r < options.omissionRate) {
        row.push(-1);
        continue;
      }
      const variant = (w !== 0 && r < options.omissionRate + options.variantRate) ? 1 + Math.floor(random() * 3) : 0;
      const text = wordForColumn(col, variant);
      tokens.push({
        tokenType: 'word', text, normalizedText: text, tokenClass: 'edition',
        sourceItems: [{index: tokens.length, charRange: {from: 0, to: text.length}}]
      } as WitnessTokenInterface);
      items.push({
        type: 'TextualItem', text, hand: 0, format: '',
        address: {
          itemIndex: items.length, textBoxIndex: 0, pageId: 1 + Math.floor(col / 300), ceId: col, column: 1,
          foliation: `${1 + Math.floor(col / 600)}r`, itemSeq: items.length, itemId: w * 1000000 + col, ceSeq: col
        }
      });
      row.push(tokens.length - 1);
    }
    collationMatrix.push(row);
    witnesses.push({
      witnessType: 'fullTx', ApmWitnessId: `fixture-w${w}`, tokens, items, lang: 'la', chunkId: 'FIX-1', chunk: 1,
      workId: 'FIX', localWitnessId: `w${w}`, docId: w + 1, timeStamp: '2026-01-01 00:00:00'
    });
  }

  const groupedColumns: number[] = [];
  for (let col = 0; col < options.numColumns - 1; col++) {
    if (random() < options.groupRate) {
      groupedColumns.push(col);
    }
  }

  const customEntries: CustomApparatusEntryInterface[] = [];
  const step = Math.max(1, Math.floor(options.numColumns / Math.max(1, options.numCustomEntries)));
  for (let i = 0; i < options.numCustomEntries; i++) {
    const col = Math.min(options.numColumns - 1, i * step + 1);
    customEntries.push({
      from: col, to: col, lemma: 'auto' as any, preLemma: '' as any, postLemma: '' as any, separator: '' as any,
      tags: [],
      subEntries: [{
        type: 'fullCustom', enabled: true, position: 0, tags: [], keyword: '',
        fmtText: fromString(`custom${i}`),
        witnessData: [{
          witnessIndex: 1 % options.numWitnesses, hand: 0, location: '', forceHandDisplay: false, siglum: '',
          omitSiglum: false
        }]
      }]
    });
  }

  const witnessIndices = Array.from({length: options.numWitnesses}, (_, i) => i);
  return {
    lang: 'la',
    witnesses,
    editionWitnessIndex: 0,
    witnessTitles: witnessIndices.map((i) => `Witness ${i}`),
    witnessOrder: witnessIndices,
    sigla: witnessIndices.map((i) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '')),
    siglaGroups: [],
    chunkId: 'FIX-1',
    tableId: 1,
    customApparatuses: [
      {type: 'criticus', entries: customEntries},
      {type: 'marginalia', entries: []}
    ],
    schemaVersion: '1',
    type: 'edition',
    title: 'Benchmark fixture',
    collationMatrix,
    groupedColumns,
    automaticNormalizationsApplied: [],
    excludeFromAutoCriticalApparatus: [],
    includeInAutoMarginalFoliation: [],
    archived: false
  };
}

/** Returns a copy of ctData where the enabled flag of one custom sub-entry was flipped (the quick-edit case). */
export function withToggledCustomSubEntry(ctData: CtDataInterface, entryIndex: number): CtDataInterface {
  const copy = deepCopy(ctData);
  const entry = copy.customApparatuses[0].entries[entryIndex];
  entry.subEntries[0].enabled = !entry.subEntries[0].enabled;
  return copy;
}

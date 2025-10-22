// noinspection ES6PreferShortImport


import {MetadataInterface} from "../Edition/EditionInterface.js";
import {CompactFmtText, FmtText} from "../lib/FmtText/FmtText";

export interface CtDataInterface {
  lang: string;
  witnesses: WitnessInterface[];
  editionWitnessIndex: number;
  witnessTitles: string[];
  witnessOrder: number[];
  sigla: string[];
  siglaGroups: SiglaGroupInterface[];
  chunkId: string;
  tableId: number;
  customApparatuses: CustomApparatusInterface[];
  schemaVersion: string;
  type: 'edition' | 'ctable';
  title: string;
  collationMatrix: number[][];
  groupedColumns: number[];
  automaticNormalizationsApplied: string[];
  excludeFromAutoCriticalApparatus: number[];
  includeInAutoMarginalFoliation: number[];
  archived: boolean;
}

export interface SiglaGroupInterface {
  siglum: string;
  witnesses: number[];
}

export interface NonTokenItemIndex {
  pre: number[];
  post: number[];
}

export interface CustomApparatusInterface {
  /**
   * Apparatus type, e.g. 'criticus', 'fontium', etc.
   */
  type: string;
  entries: CustomApparatusEntryInterface[];
  metadata?: MetadataInterface;
}

export interface CustomApparatusEntryInterface {
  /**
   * Starting column of the entry in the collation matrix
   */
  from: number;
  /**
   * Ending column of the entry in the collation matrix
   */
  to: number;
  lemma: CompactFmtText;
  postLemma: CompactFmtText;
  preLemma: CompactFmtText;
  separator: string;
  subEntries: CustomApparatusSubEntryInterface[];
  tags: string[];
}

export interface WitnessDataItemInterface {
  witnessIndex: number;
  hand: number;
  location: string;
  forceHandDisplay: boolean;
  siglum: string;
  omitSiglum: boolean;
  /**
   * If true, the data is used when there's a foliation change from
   * a non-empty foliation to a another one. For example, from '20r' to '20v'.
   * When a foliation changes from '' to other value, there's no actual foliation,
   * it's simply the first time there's a foliation value for that witness.
   */
  realFoliationChange?: boolean;
}


export const CUSTOM_APPARATUS_SUB_ENTRY_TYPE_AUTO = 'auto';
export const CUSTOM_APPARATUS_SUB_ENTRY_TYPE_FULL_CUSTOM = 'fullCustom';

export interface CustomApparatusSubEntryInterface {
  type: 'auto' | 'fullCustom';
  enabled: boolean;
  position: number;
  tags: string[];

  /**
   * Hash string used to identify an automatic entry
   */
  hash?: string;


  /**
   * Text of a fullCustom sub entry
   */
  fmtText?: FmtText;
  /**
   * Keyword of a fullCustom sub entry
   */
  keyword?: string;
  /**
   * Witness data of a fullCustom sub entry
   */
  witnessData?: WitnessDataItemInterface[];
}


export interface WitnessInterface {

  chunkId?: string;
  lang?: string;
  witnessType: string;
  timeStamp?: string;
  ApmWitnessId: string;
  tokens: WitnessTokenInterface[];

  // used by FullTx witnesses
  workId?: string;
  chunk?: number;
  localWitnessId?: string;
  docId?: number;
  items?: FullTxItemInterface[];
  nonTokenItemIndexes?: NonTokenItemIndex[];

  // used by Source witnesses
  title?: string;
}


export interface WitnessTokenInterface {
  tokenType: string;
  text: string;
  tokenClass: string;
  normalizedText?: string;
  normalizationSource?: string;
  fmtText?: FmtText;

  // used by Edition Witnesses
  markType?: string;
  style?: string;
  formats?: any[];

  // used by FullTx Witnesses
  textBox?: number | RangeInterface;
  line?: number | RangeInterface;
  sourceItems?: SourceItemInterface[];

  // used in MainTextPanel
  originalIndex?: number;
}

export interface SourceItemInterface {
  index: number;
  charRange: RangeInterface;
}

export interface RangeInterface {
  from: number;
  to: number;
}

export interface FullTxItemInterface {
  type: string;
  text: string;
  address: FullTxItemAddressInterface;
  markType?: string;
  hand?: number;
  format?: string;
  clarity?: number;
  clarityReason?: string;
  alternateTexts?: string[];
  textualFlow?: number;
  location?: string;
  deletion?: string;
  normalizationType?: string;
  notes?: any[];
  lang?: string;
}

export interface FullTxItemEditorialNote {
  authorTid: number;
  text: string;
  timeStamp: string;
}

export interface FullTxItemAddressInterface {
  itemIndex: number;
  textBoxIndex: number;
  pageId: number;
  ceId: number;
  column: number;
  foliation: string;
  itemSeq: number;
  itemId: number;
  ceSeq: number;
}

export interface ColumnInformation {
  pageId: number,
  column: number,


  // Set in WitnessInfoPanel

  docId?: number,
  foliation?: string,
  seq?: number,
  numCols?: number,

}
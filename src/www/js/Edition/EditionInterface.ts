// noinspection ES6PreferShortImport

import {FoliationChangeInfoInterface} from "./FoliationChangeInfoInterface.js";
import {CompactFmtText, FmtText} from "../lib/FmtText/FmtText.js";
import {SiglaGroupInterface, WitnessDataItemInterface} from "../CtData/CtDataInterface.js";

export interface EditionInterface {
  lang: string;
  info: EditionInfoInterface;
  mainText: MainTextTokenInterface[];
  apparatuses: ApparatusInterface[];
  witnesses: EditionWitnessInfoInterface[];
  siglaGroups: SiglaGroupInterface[];
  foliationChanges: FoliationChangeInfoInterface[] | null;
  metadata: MetadataInterface;
}

export interface EditionWitnessInfoInterface {
  siglum: string;
  title: string;
}


/**
 * A token that can appear in the main text of an edition.
 *
 * Normally in APM, the main text of an edition is built automatically from the edition witness in CtData.
 * For the purposes of the collation table and to create an automatic apparatus, the edition witness only
 * needs to contain words and punctuation, whereas an edition main text should also have proper spaces between
 * words and other formatting information suitable to feed a typesetter and produce a nice looking document
 * output.
 *
 * Spaces can be generated programmatically, but other formatting marks need to be included in the edition witness
 * as well. The idea, however, is to include minimal semantic information about these marks in the edition witness
 * having the automatic main text generation algorithm take care of processing them accordingly. This leaves open
 * the possibility of generating different representations of the edition main text.
 */
export interface MainTextTokenInterface {
  type: MainTextTokenType;
  fmtText: FmtText;
  editionWitnessTokenIndex: number;
  style: string;
}

export type MainTextTokenType =
  'text'
  | 'glue'
  | 'empty'
  | 'paragraph_end'
  | 'numbering_label'
  | 'foliation_change_marker';

export interface MetadataInterface {
  [key: string]: any;
}

export interface ApparatusInterface {
  type: string;
  entries: ApparatusEntryInterface[];
  metadata?: MetadataInterface;
  /**
   * @deprecated Is this actually needed? Maybe move it to metadata.
   */
  // rawEntries?: ApparatusEntry[];
}

export interface EditionInfoInterface extends MetadataInterface {
  source: string,
  tableId: number,
  singleChunk: boolean,
  chunkId: string,
  baseWitnessIndex: number,
  editionId: number,
}

export interface ApparatusEntryInterface {
  section?: number[];
  from: number;
  to: number;
  preLemma: string;
  lemma: CompactFmtText;
  postLemma: string;
  lemmaText: string;
  separator: string;
  tags: string[];
  subEntries: ApparatusSubEntryInterface[];
  metadata: MetadataInterface;
  mainTextFrom?: number;
  mainTextTo?: number;
}

export interface ApparatusSubEntryInterface {
  plainText?: string;
  type: string;
  enabled: boolean;
  source?: string;
  fmtText: FmtText;
  witnessData: WitnessDataItemInterface[];
  keyword: string;
  position: number;
  tags: string[];
  hash: string;
}

export function cloneMetadata(metadata: MetadataInterface): MetadataInterface {
  return JSON.parse(JSON.stringify(metadata));
}
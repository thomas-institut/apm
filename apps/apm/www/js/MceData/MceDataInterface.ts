// noinspection ES6PreferShortImport

import {SiglaGroupInterface} from "../CtData/CtDataInterface.js";


interface VersionedMceData {
  schemaVersion: '1.0' | '2' | '3';
}

export type MceDataInterface = MceDataInterface_v3;
export type MceDataInterfaceAny = MceDataInterface_v1 | MceDataInterface_v2 | MceDataInterface_v3;

export interface MceDataInterface_v1 extends VersionedMceData {
  schemaVersion: '1.0',

  title: string,
  lang: string,
  archived: boolean,
  siglaGroups: SiglaGroupInterface[],
  stylesheetId: string,
  chunks: ChunkInMceData[],
  initialSpace: string,
  preamble: any[],
  witnesses: WitnessInMceData[],
  sigla: string[],

  chunkOrder?: number[],
  includeInAutoMarginalFoliation?: number[];
}

export interface MceDataInterface_v2 extends VersionedMceData {
  schemaVersion: '2',

  title: string,
  lang: string,
  archived: boolean,
  siglaGroups: SiglaGroupInterface[],
  stylesheetId: string,
  chunks: ChunkInMceData[],
  initialSpace: string,
  preamble: any[],
  witnesses: WitnessInMceData[],
  sigla: string[],

  chunkOrder: number[],
  includeInAutoMarginalFoliation: number[];
}

export interface MceDataInterface_v3 extends VersionedMceData {
  schemaVersion: '3',

  title: string,
  lang: string,
  archived: boolean,
  siglaGroups: SiglaGroupInterface[],
  stylesheetId: string,
  chunks: ChunkInMceData[],
  initialSpace: string,
  preamble: any[],
  witnesses: WitnessInMceData[],
  sigla: string[],
  chunkOrder: number[],
  includeInAutoMarginalFoliation: number[];
  standardizedStrings: StandardizedStringData[];
}

export interface StandardizedStringData {
  original: string,
  standardized: string,
  instances: StandardizedStringInstance[];
}

export interface StandardizedStringInstance {
  chunkIndex: number;
  mainTextIndex: number;
  status: 'rejected' | 'accepted';
}

export interface WitnessInMceData {
  type?: string,
  docId?: number,
  title: string,
  localWitnessId?: string,
  witnessId: string,
  tid?: number,
}

export const ValidChunkBreaks = ['', 'paragraph'];

export interface ChunkInMceData {
  /**
   * Chunk id as 'docId-chunkNumber', e.g. 'AW47-24'
   */
  chunkId: string,
  break: string,
  chunkEditionTableId: number,
  lineNumbersRestart: boolean
  title: string,
  version: string,
  /**
   * A map between the MceData witness and the chunk witness
   *
   *  `witnessIndices[x]` : index of chunk's witness `x` in MceData's `witnesses` array
   */
  witnessIndices: number[]
}
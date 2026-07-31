// noinspection ES6PreferShortImport

import {SiglaGroupInterface} from "../CtData/CtDataInterface.js";


interface MceDataInterface {
  schemaVersion: '1.0' | '2';
  title: string,
  lang: string,
  archived: boolean,
  siglaGroups: SiglaGroupInterface[],
  stylesheetId: string,
}

export interface MceDataInterface_v1  extends  MceDataInterface {
  schemaVersion: '1.0',

  chunks: ChunkInMceData[],
  initialSpace: string,
  preamble: any[],
  witnesses: WitnessInMceData[],
  sigla: string[],

  chunkOrder?: number[],
  includeInAutoMarginalFoliation?: number[];
}

export interface MceDataInterface_v2 extends MceDataInterface {
  schemaVersion: '2',

  chunks: ChunkInMceData[],
  initialSpace: string,
  preamble: any[],
  witnesses: WitnessInMceData[],
  sigla: string[],

  chunkOrder: number[],
  includeInAutoMarginalFoliation: number[];
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
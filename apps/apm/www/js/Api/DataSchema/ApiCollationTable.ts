import {CtDataInterface} from "@/CtData/CtDataInterface";
import {ApiResponse} from "@/Api/DataSchema/ApiResponse";

export interface ApiCollationTableAuto {
  type: string;
  collationTableCacheId: string;
  collationEngineDetails: EngineRunDetails;
  collationTable: CtDataInterface;
  automaticNormalizationsApplied: string[];
  people: PeopleInfoObject;

}


export interface EngineRunDetails {
  engineName: string;
  errorCode: number;
  errorContext: string;
  runDateTime: string;
  duration: number;
  cached: boolean;
  totalDuration: number;
  cachedRunTime?: number;
}

export type PeopleInfoObject = { [key: number]: AutoCTablePersonInfo };

export interface AutoCTablePersonInfo {
  fullName: string;
  shortName: string;
  name: string;
}

export interface AutomaticCollationSettings {
  collationEngine: string,
  lang: string,
  work: string,
  chunk: number,
  ignorePunctuation: boolean,
  witnesses: WitnessInfoForAutomaticCollation[];
  normalizers?: string[] | null;
}

export interface WitnessInfoForAutomaticCollation {
  type: 'fullTx';
  systemId: string;
  title: string;
}

export interface ApiCollationTableConvertToEdition {
  status: string;
  tableId: number;
  url: string;
}

export interface ApiCollationTable_convertToEdition_input {
  tableId: number;
  initStrategy: 'topWitness';  // only one strategy for now
}

/**
 * Data returned by the collationTable versionInfo API call
 */
export interface ApiCollationTableVersionInfo extends ApiResponse {
  result: 'Success';
  tableId: number;
  type: string;
  title: string;
  timeFrom: string;
  timeUntil: string;
  isLatestVersion: boolean;
  archived: boolean;
}


export interface ApiCollationTableTableInfoArray extends ApiResponse {
  result: 'Success';
  tableInfoArray: ApiCollationTableInfo[];
}

export interface ApiCollationTableInfo {
  id: number;
  title: string;
  workId: string;
  chunkId: string;
  chunkNumber: number;
  type: string;
  lastChange: string;
  lastVersion: any|null;
  witnesses: string[];
}

export interface SingleChunkApiData {
  authorTid: number;
  ctData: CtDataInterface;
  ctInfo: CtInfo[];
  docInfo: DocInfoInSingleChunkApiData[];
  isLatestVersion: boolean;
  timeStamp: string;
  versionId: number;
  versions: CtVersionInfo[];
}

export interface CtInfo {
  archived: boolean;
  timeFrom: string;
  timeUntil: string;
  title: string;
  type: string;
}

export interface DocInfoInSingleChunkApiData {
  docId: number;
  title: string;
}

export interface CtVersionInfo {
  authorTid: number;
  collationTableId: number;
  description: string;
  id: number;
  isMinor: boolean;
  isReview: boolean;
  timeFrom: string;
  timeUntil: string;
}
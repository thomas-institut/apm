import {CtDataInterface} from "@/CtData/CtDataInterface";

export interface ApiCollationTable_auto {
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

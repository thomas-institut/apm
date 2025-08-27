import {CtDataInterface} from "@/CtData/CtDataInterface";

export interface ApiCollationTable_auto {
  type: string;
  collationTableCacheId: string;
  collationEngineDetails: EngineRunDetails;
  collationTable: CtDataInterface;
  automaticNormalizationsApplied: string[];
  people: { [key: number]: AutoCTablePersonInfo };

}


interface EngineRunDetails {
  engineName: string;
  errorCode: number;
  errorContext: string;
  runDateTime: string;
  duration: number;
  cached: boolean;
  totalDuration: number;
  cachedRunTime?: number;
}


interface AutoCTablePersonInfo {
  fullName: string;
  shortName: string;
}

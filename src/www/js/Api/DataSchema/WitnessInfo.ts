
export interface WitnessInfo {
  chunkNumber: number;
  errorCode: number;
  index: number;
  isValid: boolean;
  language: number;
  languageCode: string;
  systemId: string;
  title: string;
  type: string;
  typeSpecificInfo: GenericWitnessSpecificInfo;
  workId: string;
}


export type GenericWitnessSpecificInfo = { [key: string]: any }
export interface FullTxSpecificInfo  {
  localWitnessId: string;
}
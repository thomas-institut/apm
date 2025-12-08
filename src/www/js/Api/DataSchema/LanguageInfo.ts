
export type LanguageInfoObject = { [key:string]: LanguageInfo}

export interface LanguageInfo {
  name: string,
  code: string,
  rtl: boolean,
  fontsize: number,
  totalWitnesses: number,
  validWitnesses: number,
  normalizerData: any[];
}
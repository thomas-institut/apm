export interface LemmaComponents {
  type: string,
  text: string,
  from?: string,
  separator?: string,
  to?: string,
  numWords?: number
}

export class ApparatusUtil {
  static getLemmaComponents(apparatusEntryLemma, lemmaText) : LemmaComponents;
  static getSiglaData(witnessData: WitnessData, sigla: string[], siglaGroups) : WitnessData[];
}
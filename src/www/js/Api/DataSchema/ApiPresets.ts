


export interface ApiSiglaPreset {
  presetId: number;
  title: string;
  userId: number;
  data: SiglaPresetData;
}

export interface SiglaPresetData {
  lang: string;
  witnesses: { [key: string]: string };
}

export interface ApiAutomaticCollationTablePreset {
  presetId: number;
  title: string;
  userId: number;
  userName: string;
  data: AutomaticCollationTablePresetData;
}

export interface AutomaticCollationTablePresetData {
  lang: string;
  witnesses: string[];
  ignorePunctuation: boolean;
  normalizers: string[] | null;
}

export interface ApiPresetsQuery {
  lang: string;
  witnesses: string[];
  userId?: number;
}
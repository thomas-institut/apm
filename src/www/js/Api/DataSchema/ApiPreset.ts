export interface ApiPreset {
  presetId: number;
  title: string;
  userId: number;
  data: SiglaPresetData;
}

export interface SiglaPresetData {
  lang: string;
  witnesses: { [key: string]: string };
}

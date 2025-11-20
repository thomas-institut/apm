
export interface ApiPresetGetPresetsResponse {
  presets: ApiPreset[];
}

export interface ApiPreset {
  presetId: number;
  title: string;
  userId: number;
  data: PresetData;
}

/**
 * Preset data returned by the API.
 *
 * Currently there are only presets with tool ids 'automaticCollation_v2' and 'sigla'.
 * Both have data with the same structure.
 *
 */
export interface PresetData {
  lang: string;
  witnesses: { [key: string]: string };
}

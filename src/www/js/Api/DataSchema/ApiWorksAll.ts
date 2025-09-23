
export type ApiWorksAll = { [key: string]: ApiWorksAllWorkData}

interface ApiWorksAllWorkData {
  workId: string;
  isValid: boolean;
  entityId: number;
  authorId: number;
  title: string;
  shortTitle: string;
  enabled: boolean;
  chunks: ApiWorksAllChunkData[];
}

interface ApiWorksAllChunkData {
  n: number;
  tx: boolean;
  ed: boolean;
  ct: boolean;
}
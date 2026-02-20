
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

export interface WorkData {
  authorId: number;
  enabled: boolean;
  entityId: number;
  shortTitle: string;
  title: string;
  workId: string;
}

export interface ApiChunksWithTranscription {
  workId: string;
  chunks: number[];
}

export interface ChunkCollationTableInfo {
  workId: string;
  chunkNumber: number;
  tableId: number;
  authorId: number;
  lastSave: string;
  title: string;
  type: 'edition' | 'ctable';
}
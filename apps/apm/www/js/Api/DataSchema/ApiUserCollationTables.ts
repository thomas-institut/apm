

export interface TableInfo {
  id: number;
  title: string;
  type: string;
  chunkId: string;
  work: string;
  chunk: string;
}

export interface WorkInfo {
  entityId: number;
  workId: string;
  authorId: number;
  title: string;
  shortTitle: string;
  enabled: boolean;
  author_name: string;
}

export interface ApiUserCollationTables {
  tableInfo: TableInfo[];
  workInfo: { [key: string] : WorkInfo};
}

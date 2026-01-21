


export interface ApiPersonWorksResponse {
  tid: number;
  works: ApiPersonWorksWorkData[];
}

export interface ApiPersonWorksWorkData {
  entityId: number,
  workId: string,
  authorId: number,
  title: string,
  shortTitle: string,
  enabled: boolean
}
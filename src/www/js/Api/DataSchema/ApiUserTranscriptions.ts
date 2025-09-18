


export interface ApiUserTranscriptions {
  docIds: number[],
  docInfoArray: { [key: number]: UserTranscriptionsDocInfo};
  pageInfoArray: LegacyPageInfo[];
}

export interface UserTranscriptionsDocInfo {
  id: number,
  title: string,
  imageSource: number;
  imageSourceData: string;
  pageIds: number[];
  language: number;
  type: number;
}

export interface LegacyPageInfo {
  docId: number,
  pageNumber: number,
  imageNumber: number,
  sequence: number,
  type: number,
  lang: number,
  numCols: number,
  foliation: string,
  pageId: number,
  foliationIsSet: boolean,
}
export interface DocumentData {
  docInfo: {
    id: number; title: string; doc_type: number; lang: number;
  };
  numPages: number;
  numTranscribedPages: number;
  transcribers: number[];
}

export interface PageInfo {
  docId: number;
  pageNumber: number;
  imageNumber: number;
  sequence: number;
  type: number;
  lang: number;
  numCols: number;
  foliation: string;
  pageId: number;
  foliationIsSet: boolean;
}
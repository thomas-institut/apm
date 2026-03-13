
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

  isTranscribed: boolean; // Wichtig für die CSS-Klasse 'without-transcription'
  thumbnailUrl: string;   // Für die Anzeige in der Liste
  jpgUrl: string;         // Als Fallback oder für den großen Viewer
}

export interface DocInfo {
  id: number;
  title: string;
  imageSource: number;
  imageSourceData: string;
  pageIds: number[];
  pageInfoArray?: PageInfo[];
  language: number;
  type: number;
}
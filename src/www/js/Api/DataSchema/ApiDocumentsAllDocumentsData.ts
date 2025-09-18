export interface DocumentData {
  docInfo: {
    id: number; title: string; doc_type: number; lang: number;
  };
  numPages: number;
  numTranscribedPages: number;
  transcribers: number[];
}
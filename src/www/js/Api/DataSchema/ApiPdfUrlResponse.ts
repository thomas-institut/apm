export interface ApiTypesetPdfResponse {
  status: 'OK';
  url: string;
  cached: boolean;
  typesetterProcessingTime: number;
}

export interface ApiClientPdfUrlResponse {
  url: string | null;
  errorMsg?: string;
}
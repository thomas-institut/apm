import {ApiResponse} from "@/Api/DataSchema/ApiResponse";

export interface ApiTypesetPdfResponse extends ApiResponse{
  result: 'Success';
  url: string;
  cached: boolean;
  typesetterProcessingTime: number;
}

export interface ApiClientPdfUrlResponse {
  url: string | null;
  errorMsg?: string;
}
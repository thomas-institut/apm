import {ApiResponse} from "@/Api/DataSchema/ApiResponse";

export interface MceShortInfo {
  id: number;
  title: string;
}


export interface ApiUserMultiChunkEditionApiResponse extends ApiResponse {
  result: 'Success';
  editions: MceShortInfo[];
}
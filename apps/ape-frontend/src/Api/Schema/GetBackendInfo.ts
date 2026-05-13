import {ApiResponse} from "@/Api/Schema/ApiResponse";


export interface BackendInfo {
  name: string;
  version: string;
  versionDate: string;
}


export interface GetBackendInfoResponse extends ApiResponse {
  result: 'Success';
  backendInfo: BackendInfo;
}
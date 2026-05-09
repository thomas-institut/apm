import {ApiResponse} from "@/Api/DataSchema/ApiResponse";


export interface ApiLoginRequest {
  user: string;
  pwd: string;
  rememberMe: string;
}

export interface ApiLoginResponse extends ApiResponse {
  result: 'Success';
  token: string;
  message: string;
  ttl: number;
}
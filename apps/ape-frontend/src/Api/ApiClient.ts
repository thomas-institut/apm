import {BackendInfo, GetBackendInfoResponse} from "@/Api/Schema/GetBackendInfo";
import {ApiErrorResponse, ApiResponse} from "@/Api/Schema/ApiResponse";


export interface ApiClientResponse<T> {
  result: 'Success' | 'Error';
  message?: string;
  httpStatus?: number;
  timestamp: number;
  data?: T;
}

export class ApiClient {

  private baseUrl: string = 'http://localhost:9999/api';

  withBaseUrl(baseUrl: string): ApiClient {
    this.baseUrl = baseUrl;
    return this;
  }

  async getBackendInfo(): Promise<ApiClientResponse<BackendInfo>> {
    const url = this.baseUrl + '/info';
    const clientResponse: ApiClientResponse<BackendInfo> = {
      result: 'Success',
      timestamp: -1,
      httpStatus: 0,
    }
    const fetchResponse = await fetch(url);
    if (!fetchResponse.ok) {
      clientResponse.result = 'Error';
      clientResponse.httpStatus = fetchResponse.status;
      clientResponse.message = fetchResponse.statusText;
      clientResponse.timestamp = Date.now();
      return clientResponse
    }
    const response = await fetchResponse.json() as ApiResponse;
    if (response.result === 'Error') {
      const errorResponse = response as ApiErrorResponse;
      clientResponse.result = 'Error';
      clientResponse.message = errorResponse.message;
      clientResponse.httpStatus = errorResponse.httpStatus;
      clientResponse.timestamp = errorResponse.timestamp;
      return clientResponse;
    }
    const apiResponse = response as GetBackendInfoResponse;
    clientResponse.result = 'Success';
    clientResponse.httpStatus = fetchResponse.status;
    clientResponse.timestamp = apiResponse.timestamp;
    clientResponse.data = apiResponse.backendInfo;
    return clientResponse;
  }

}

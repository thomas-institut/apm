import {AppConfig, GetAppConfigApiResponse} from "@/Api/Schema/GetAppConfig";
import {ApiErrorResponse, ApiResponse} from "@/Api/Schema/ApiResponse";
import {
  AnyPublicationData,
  PublicationApiListResponse,
  PublicationApiGetResponse,
  PublicationListing,
} from "@/Api/Schema/ApiPublication";
import {GetPublicationLastUpdateApiResponse} from "@/Api/Schema/GetPublicationLastUpdate";

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

  async getAppConfig(): Promise<ApiClientResponse<AppConfig>> {
    return this.callApi<GetAppConfigApiResponse, AppConfig>(
      '/app/config',
      (response) => response.appConfig,
    );
  }

  async getPublicationListings(): Promise<ApiClientResponse<PublicationListing[]>> {
    return this.callApi<PublicationApiListResponse, PublicationListing[]>(
      '/publication/list',
      (response) => response.publications,
    );
  }

  async getPublicationData(publicationId: number): Promise<ApiClientResponse<AnyPublicationData>> {
    return this.callApi<PublicationApiGetResponse, AnyPublicationData>(
      `/publication/${publicationId}/get`,
      (response) => response.publicationData,
    );
  }

  async getPublicationLastUpdate(): Promise<ApiClientResponse<number>> {
    return this.callApi<GetPublicationLastUpdateApiResponse, number>(
      '/publication/lastUpdate',
      (response) => this.unixSecondsToJsMs(response.apmLastUpdate),
    );
  }

  private async callApi<TApiResponse extends ApiResponse, TData>(
    path: string,
    mapSuccessData: (apiResponse: TApiResponse) => TData,
  ): Promise<ApiClientResponse<TData>> {
    const url = this.baseUrl + path;

    try {
      const fetchResponse = await fetch(url);

      let response: ApiResponse | null = null;
      try {
        response = await fetchResponse.json() as ApiResponse;
      } catch {
        // If we cannot parse JSON we still return a normalized error response below.
      }

      if (response !== null && response.result === 'Error') {
        const errorResponse = response as ApiErrorResponse;
        return {
          result: 'Error',
          message: errorResponse.message,
          httpStatus: errorResponse.httpStatus,
          timestamp: this.unixSecondsToJsMs(errorResponse.timeStamp),
        };
      }

      if (!fetchResponse.ok) {
        return {
          result: 'Error',
          httpStatus: fetchResponse.status,
          message: fetchResponse.statusText,
          timestamp: Date.now(),
        };
      }

      if (response === null) {
        return {
          result: 'Error',
          httpStatus: fetchResponse.status,
          message: 'Invalid JSON response from server',
          timestamp: Date.now(),
        };
      }

      const apiResponse = response as TApiResponse;
      return {
        result: 'Success',
        httpStatus: fetchResponse.status,
        timestamp: this.unixSecondsToJsMs(apiResponse.timeStamp),
        data: mapSuccessData(apiResponse),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error while calling API';
      return {
        result: 'Error',
        message,
        httpStatus: 0,
        timestamp: Date.now(),
      };
    }
  }

  private unixSecondsToJsMs(unixSeconds: number): number {
    return unixSeconds * 1000;
  }

}

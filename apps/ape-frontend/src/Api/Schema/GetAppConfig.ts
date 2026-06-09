import {ApiSuccessResponse} from "@shared/ts";

/**
 * Mirrors \ThomasInstitut\Ape\ActionsSchema\BackendInfo
 */
export interface AppConfig {
  name: string;
  shortName: string;
  version: string;
  versionDate: string;
}

/**
 * Mirrors \ThomasInstitut\Ape\ApiSchema\GetBackendInfoApiResponse
 */
export interface GetAppConfigApiResponse extends ApiSuccessResponse {
  appConfig: AppConfig;
}


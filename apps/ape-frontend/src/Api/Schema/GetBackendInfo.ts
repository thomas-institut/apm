import {ApiSuccessResponse} from "@/Api/Schema/ApiResponse";

/**
 * Mirrors \ThomasInstitut\Ape\ActionsSchema\BackendInfo
 */
export interface BackendInfo {
  name: string;
  version: string;
  versionDate: string;
}

/**
 * Mirrors \ThomasInstitut\Ape\ApiSchema\GetBackendInfoApiResponse
 */
export interface GetBackendInfoApiResponse extends ApiSuccessResponse {
  backendInfo: BackendInfo;
}

// Backward-compatible alias used by current client code.
export type GetBackendInfoResponse = GetBackendInfoApiResponse;

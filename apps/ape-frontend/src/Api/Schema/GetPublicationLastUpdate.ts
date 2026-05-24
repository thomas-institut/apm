import {ApiSuccessResponse} from "@/Api/Schema/ApiResponse";

/**
 * Mirrors \ThomasInstitut\Ape\ApiSchema\GetPublicationLastUpdateApiResponse
 */
export interface GetPublicationLastUpdateApiResponse extends ApiSuccessResponse {
  apmLastUpdate: number;
}

import {ApiSuccessResponse} from "@shared/ts";

/**
 * Mirrors \ThomasInstitut\Ape\ApiSchema\GetPublicationLastUpdateApiResponse
 */
export interface GetPublicationLastUpdateApiResponse extends ApiSuccessResponse {
  apmLastUpdate: number;
}

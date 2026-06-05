export type ApiResult = 'Success' | 'Error' | 'Undefined';

/**
 * Mirrors \ThomasInstitut\StandardApi\ApiResponse
 */
export interface ThomasInstStandardApiResponse {
  result: ApiResult;
  timeStamp: number;
}

/**
 * Mirrors \ThomasInstitut\StandardApi\ErrorResponse
 */
export interface ApiErrorResponse extends ThomasInstStandardApiResponse {
  result: 'Error';
  message: string;
  httpStatus: number;
}

/**
 * Mirrors \ThomasInstitut\StandardApi\SuccessResponse
 */
export interface ApiSuccessResponse extends ThomasInstStandardApiResponse {
  result: 'Success';
}

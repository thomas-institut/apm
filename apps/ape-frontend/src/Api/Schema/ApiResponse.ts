export type ApiResult = 'Success' | 'Error' | 'Undefined';

/**
 * Mirrors \ThomasInstitut\StandardApi\ApiResponse
 */
export interface ApiResponse {
  result: ApiResult;
  timeStamp: number;
}

/**
 * Mirrors \ThomasInstitut\StandardApi\ErrorResponse
 */
export interface ApiErrorResponse extends ApiResponse {
  result: 'Error';
  message: string;
  httpStatus: number;
}

/**
 * Mirrors \ThomasInstitut\StandardApi\SuccessResponse
 */
export interface ApiSuccessResponse extends ApiResponse {
  result: 'Success';
}

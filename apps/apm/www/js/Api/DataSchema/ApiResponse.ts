export interface ApiResponse {
  result: 'Success' | 'Error';
  timestamp: number;
}

export interface ApiErrorResponse extends ApiResponse {
  result: 'Error';
  message: string;
  httpStatus: number;
}

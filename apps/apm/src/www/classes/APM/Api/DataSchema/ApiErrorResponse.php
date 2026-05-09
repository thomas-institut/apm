<?php

namespace APM\Api\DataSchema;

use APM\ToolBox\HttpStatus;

final class ApiErrorResponse extends ApiResponse
{
    public string $result = ApiResponse::ResultError;
    public string $message = '';
    public int $httpStatus = HttpStatus::INTERNAL_SERVER_ERROR;

    public function __construct(string $message, int $httpStatus = HttpStatus::INTERNAL_SERVER_ERROR)
    {
        $this->message = $message;
        $this->httpStatus = $httpStatus;
    }
}
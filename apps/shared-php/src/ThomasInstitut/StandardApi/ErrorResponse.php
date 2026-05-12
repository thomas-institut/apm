<?php

namespace ThomasInstitut\StandardApi;


use ThomasInstitut\Http\HttpStatus;

class ErrorResponse extends ApiResponse
{
    public string $result = ApiResponse::ResultError;
    public string $message = '';
    public int $httpStatus = HttpStatus::INTERNAL_SERVER_ERROR;

    public function __construct(string $message, int $httpStatus = HttpStatus::INTERNAL_SERVER_ERROR)
    {
        parent::__construct();
        $this->message = $message;
        $this->httpStatus = $httpStatus;
    }
}
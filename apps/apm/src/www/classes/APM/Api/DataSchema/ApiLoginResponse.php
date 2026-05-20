<?php

namespace APM\Api\DataSchema;

use ThomasInstitut\StandardApi\ApiResponse;

final class ApiLoginResponse extends ApiResponse
{
    public string $result = ApiResponse::ResultSuccess;
    public string $message = '';
    public string $token = '';
    public int $ttl = -1;
}
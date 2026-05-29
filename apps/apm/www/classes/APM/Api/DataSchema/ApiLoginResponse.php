<?php

namespace APM\Api\DataSchema;

use ThomasInstitut\StandardApi\ApiResponse;
use ThomasInstitut\StandardApi\SuccessResponse;

final class ApiLoginResponse extends SuccessResponse
{
    public string $message = '';
    public string $token = '';
    public int $ttl = -1;
}
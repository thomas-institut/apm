<?php

namespace APM\Api\DataSchema;

final class ApiLoginResponse extends ApiResponse
{
    public string $result = 'Success';
    public string $message = '';
    public string $token = '';
    public int $ttl = -1;
}
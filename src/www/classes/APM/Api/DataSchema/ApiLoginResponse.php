<?php

namespace APM\Api\DataSchema;

final class ApiLoginResponse
{
    public string $status = 'OK';
    public string $message = '';
    public string $token = '';
    public int $ttl = -1;
}
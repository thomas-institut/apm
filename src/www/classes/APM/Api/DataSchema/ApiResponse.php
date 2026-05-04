<?php

namespace APM\Api\DataSchema;

abstract class ApiResponse
{
    const string ResultSuccess = 'Success';
    const string ResultError = 'Error';
    const string ResultUndefined = 'Undefined';

    public string $result = self::ResultUndefined;
    public int $timeStamp = -1;

    public function withTimeStampNow(): self
    {
        $this->timeStamp = time();
        return $this;
    }
}
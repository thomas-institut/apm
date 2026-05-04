<?php

namespace APM\Api\DataSchema;

final class ApiTypesetPdfResponse
{
    public string $status = 'Undefined';
    public bool $cached = true;
    public string $url = '';
    public float $typesetterProcessingTime = 0.0;
}
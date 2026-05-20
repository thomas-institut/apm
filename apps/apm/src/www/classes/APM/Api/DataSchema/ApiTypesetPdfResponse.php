<?php

namespace APM\Api\DataSchema;

use ThomasInstitut\StandardApi\ApiResponse;

final class ApiTypesetPdfResponse extends ApiResponse
{
    public bool $cached = true;
    public string $url = '';
    public float $typesetterProcessingTime = 0.0;
}
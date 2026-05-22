<?php

namespace APM\Api\DataSchema;

use ThomasInstitut\StandardApi\SuccessResponse;

final class ApiTypesetPdfResponse extends SuccessResponse
{
    public bool $cached = true;
    public string $url = '';
    public float $typesetterProcessingTime = 0.0;
}
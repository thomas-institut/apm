<?php

namespace APM\Api\DataSchema;

use ThomasInstitut\StandardApi\SuccessResponse;

class ApiMceGetResponse extends SuccessResponse
{
    public int $authorId;
    /**
     * @var string[]
     */
    public array $chunks;
    public string $versionDescription;
    public string $validFrom;
    public string $validUntil;
    public array $mceData;
}
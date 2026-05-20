<?php

namespace APM\Api\DataSchema;

use ThomasInstitut\StandardApi\ApiResponse;

class ApiPublicationGetResponse extends ApiResponse
{

    /**
     * @var array<string, mixed>
     */
    public array $publicationData = [];
}
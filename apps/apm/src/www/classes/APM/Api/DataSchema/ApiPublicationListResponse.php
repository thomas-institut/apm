<?php

namespace APM\Api\DataSchema;


use ThomasInstitut\StandardApi\ApiResponse;

class ApiPublicationListResponse extends ApiResponse
{
    /**
     * @var int[]
     */
    public array $publications = [];
}
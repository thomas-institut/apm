<?php

namespace ThomasInstitut\ApmPublicationApi;


use ThomasInstitut\StandardApi\ApiResponse;

class PublicationApiListResponse extends ApiResponse
{
    /**
     * @var int[]
     */
    public array $publications = [];
}
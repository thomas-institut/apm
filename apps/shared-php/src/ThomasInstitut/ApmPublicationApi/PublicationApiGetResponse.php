<?php

namespace ThomasInstitut\ApmPublicationApi;

use ThomasInstitut\StandardApi\ApiResponse;

class PublicationApiGetResponse extends ApiResponse
{

    /**
     * @var array<string, mixed>
     */
    public array $publicationData = [];
}
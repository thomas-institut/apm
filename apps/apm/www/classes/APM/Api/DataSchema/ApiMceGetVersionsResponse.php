<?php

namespace APM\Api\DataSchema;

use APM\MultiChunkEdition\MceVersionInfo;
use ThomasInstitut\StandardApi\SuccessResponse;

class ApiMceGetVersionsResponse extends SuccessResponse
{

    /**
     * @var MceVersionInfo[]
     */
    public array $versions;
}
<?php

namespace APM\Api\DataSchema;

use ThomasInstitut\StandardApi\SuccessResponse;

class ApiUsersMultiChunkEditions extends SuccessResponse
{
   /** @var array<MceShortInfo> */
    public array $editions;
}
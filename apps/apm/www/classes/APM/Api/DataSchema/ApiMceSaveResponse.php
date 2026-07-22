<?php

namespace APM\Api\DataSchema;

use ThomasInstitut\StandardApi\SuccessResponse;

class ApiMceSaveResponse extends SuccessResponse
{
    public int $id;
    public string $saveTimeStamp;
}
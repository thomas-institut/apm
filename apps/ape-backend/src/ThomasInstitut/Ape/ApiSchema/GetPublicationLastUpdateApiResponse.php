<?php

namespace ThomasInstitut\Ape\ApiSchema;

use ThomasInstitut\StandardApi\SuccessResponse;

class GetPublicationLastUpdateApiResponse extends SuccessResponse
{
    public int $apmLastUpdate;
}
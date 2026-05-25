<?php

namespace ThomasInstitut\Ape\ApiSchema;

use ThomasInstitut\Ape\ActionsSchema\AppConfig;
use ThomasInstitut\StandardApi\SuccessResponse;

class GetAppConfigApiResponse extends SuccessResponse
{
    public AppConfig $appConfig;
}
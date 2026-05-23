<?php

namespace ThomasInstitut\Ape\ApiSchema;

use ThomasInstitut\Ape\ActionsSchema\BackendInfo;
use ThomasInstitut\StandardApi\SuccessResponse;

class GetBackendInfoApiResponse extends SuccessResponse
{
    public BackendInfo $backendInfo;
}
<?php

namespace ThomasInstitut\Ape\ApiSchema;

use ThomasInstitut\Ape\ActionsSchema\BackendInfo;
use ThomasInstitut\StandardApi\ApiResponse;

class GetBackendInfoApiResponse extends ApiResponse
{
    public BackendInfo $backendInfo;
}
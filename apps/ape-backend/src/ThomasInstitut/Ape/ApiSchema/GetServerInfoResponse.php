<?php

namespace ThomasInstitut\Ape\ApiSchema;

use ThomasInstitut\Ape\ActionsSchema\ServerInfo;
use ThomasInstitut\StandardApi\ApiResponse;

class GetServerInfoResponse extends ApiResponse
{
    public ServerInfo $serverInfo;
}
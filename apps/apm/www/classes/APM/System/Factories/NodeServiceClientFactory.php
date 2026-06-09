<?php

namespace APM\System\Factories;

use APM\NodeService\NodeServiceClient;
use APM\System\Config\ApmSystemConfig;


class NodeServiceClientFactory
{
    static public function create(ApmSystemConfig $config) : NodeServiceClient {
        return new NodeServiceClient($config->nodeService->url, $config->nodeService->httpTimeout);
    }
}
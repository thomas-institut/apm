<?php

namespace APM\System\Factories;

use APM\System\Config\ApmSystemConfig;
use Predis\Client;
class ValkeyClientFactory
{
     static public function create(ApmSystemConfig $config): Client
    {
          return new Client([
            'scheme' => 'tcp',
            'host' => $config->valkey->host,
            'port' => $config->valkey->port
        ]);

    }
}
<?php

namespace APM\System\Factories;

use APM\System\Config\ApmSystemConfig;
use RuntimeException;
use Typesense\Client;
use Typesense\Exceptions\ConfigError;

class TypesenseClientFactory
{

    public static function create(ApmSystemConfig $config): Client
    {
        try {
            return new Client(
                [
                    'api_key' => $config->typesense->key,
                    'nodes' => [
                        [
                            'host' => $config->typesense->host,
                            'port' => $config->typesense->port,
                            'protocol' => $config->typesense->protocol,
                        ],
                    ],
                    'connection_timeout_seconds' => $config->typesense->connectionTimeout,
                ]
            );
        } catch (ConfigError) {
            throw new RuntimeException("Typesense incorrectly configured");
        }
    }
}
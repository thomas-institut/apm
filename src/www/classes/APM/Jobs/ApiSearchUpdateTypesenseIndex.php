<?php

namespace APM\Jobs;

use APM\System\ApmConfigParameter;
use Typesense\Client;

abstract class ApiSearchUpdateTypesenseIndex
{
    protected $client;

    protected function initializeTypesenseClient(array $config): void
    {
        try {
            $this->client = new Client(
                [
                    'api_key' => $config[ApmConfigParameter::TYPESENSE_KEY],
                    'nodes' => [
                        [
                            'host' => $config[ApmConfigParameter::TYPESENSE_HOST], // For Typesense Cloud use xxx.a1.typesense.net
                            'port' => $config[ApmConfigParameter::TYPESENSE_PORT],      // For Typesense Cloud use 443
                            'protocol' => $config[ApmConfigParameter::TYPESENSE_PROTOCOL],      // For Typesense Cloud use https
                        ],
                    ],
                    'connection_timeout_seconds' => 2,
                ]
            );

        } catch (\Typesense\Exceptions\ConfigError $e) {

        }
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}
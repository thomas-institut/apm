<?php

namespace APM\Jobs;

use APM\System\ApmConfigParameter;
use OpenSearch\ClientBuilder;

abstract class ApiSearchUpdateOpenSearchIndex
{
//    protected $client;
//
//    protected function initializeOpenSearchClient(array $config): void
//    {
//        $this->client = (new ClientBuilder())
//            ->setHosts($config[ApmConfigParameter::OPENSEARCH_HOSTS])
//            ->setBasicAuthentication($config[ApmConfigParameter::OPENSEARCH_USER], $config[ApmConfigParameter::OPENSEARCH_PASSWORD])
//            ->setSSLVerification(false) // For testing only. Use certificate for validation
//            ->build();
//    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}
<?php

namespace APM\Jobs;

use APM\System\ApmConfigParameter;
use APM\System\PythonLemmatizer;
use OpenSearch\ClientBuilder;

abstract class ApiSearchUpdateOpenSearchIndex
{
    protected $client;

    protected function initializeOpenSearchClient(array $config): void
    {
        $this->client = (new ClientBuilder())
            ->setHosts($config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($config[ApmConfigParameter::OPENSEARCH_USER], $config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();
    }

    protected function generateUniqueOpenSearchId($indexManager, string $indexname): int
    {
        $opensearchID_list = $indexManager->getIDs($this->client, $indexname);
        $max_id = max($opensearchID_list);
        return $max_id + 1;
    }

    protected function runLemmatizer(string $lang, string $text_encoded): array
    {
        PythonLemmatizer::runLemmatizer($lang, $text_encoded, $tokens_and_lemmata);
//        exec("python3 ../../python/Lemmatizer_Indexing.py $lang $text_encoded", $tokens_and_lemmata);
        return $tokens_and_lemmata;
    }
    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}
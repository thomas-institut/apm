<?php

namespace APM\Jobs;

use APM\CommandLine\EditionIndexCreator;
use APM\System\ApmConfigParameter;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use OpenSearch\ClientBuilder;

class ApiSearchUpdateEditionsOpenSearchIndex implements JobHandlerInterface
{
    private $client;

    public function run(SystemManager $sm, array $payload): bool
    {
        $logger = $sm->getLogger();
        $config = $sm->getConfig();

        try {
            $this->initializeOpenSearchClient($config);
        } catch (\Exception $e) {
            $logger->debug('Connecting to OpenSearch server failed.');
            return false;
        }

        $editionIndexCreator = new EditionIndexCreator($config, 0, [0]);

        // Fetch data from payload
        $table_id = $payload[0];

        // Fetch indexing-relevant data from the SQL database
        $cTableManager = $sm->getCollationTableManager();
        $data = $editionIndexCreator->getEditionData($cTableManager, $table_id);

        if (!empty($data)) {
            
            // Clean edition data and check if edition already indexed
            $data = $editionIndexCreator->cleanEditionData([$data])[0];
            $editionStatus = $this->getEditionStatus($table_id, $data['lang']);

            $this->updateIndex($editionIndexCreator, $editionStatus, $data);
        }

        return true;
    }

    private function initializeOpenSearchClient(array $config): void
    {
        $this->client = (new ClientBuilder())
            ->setHosts($config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($config[ApmConfigParameter::OPENSEARCH_USER], $config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();
    }

    private function getEditionStatus(int $table_id, string $lang): array
    {
        $index_name = 'editions_' . $lang;

        $query = $this->client->search([
            'index' => $index_name,
            'body' => [
                'size' => 20000,
                'query' => [
                    'bool' => [
                        'must' => [
                            'match' => [
                                'table_id' => $table_id
                            ]
                        ]
                    ]
                ]
            ]
        ]);

        $exists = $query['hits']['total']['value'];
        $opensearchID = ($exists === 1) ? $query['hits']['hits'][0]['_id'] : 'null';

        return ['exists' => $exists, 'id' => $opensearchID, 'indexname' => $index_name];
    }

    private function generateUniqueOpenSearchId(string $indexname): int
    {
        $opensearchID_list = $this->client->getIDs($indexname);
        $max_id = max($opensearchID_list);
        return $max_id + 1;
    }


    private function updateIndex($editionIndexCreator, array $editionStatus, array $data): void
    {

        if ($editionStatus['exists'] === 0) { // New edition was created

            $opensearchID = $this->generateUniqueOpenSearchId($editionStatus['indexname']);
            $editionIndexCreator->indexEdition(
                $this->client,
                $opensearchID,
                $data['editor'],
                $data['text'],
                $data['title'],
                $data['chunk_id'],
                $data['lang'],
                $data['table_id']
            );

        } else { // Existing edition was changed

            $text_encoded = $editionIndexCreator->encodeForLemmatization($data['text']);
            $tokens_and_lemmata = $this->runLemmatizer($data['lang'], $text_encoded);

            // Get tokenized and lemmatized edition
            $edition_tokenized = explode("#", $tokens_and_lemmata[0]);
            $edition_lemmatized = explode("#", $tokens_and_lemmata[1]);

            $this->client->update([
                'index' => $editionStatus['indexname'],
                'id' => $editionStatus['id'],
                'body' => [
                    'doc' => [
                        'table_id' => $data['table_id'],
                        'chunk' => $data['chunk_id'],
                        'creator' => $data['editor'],
                        'title' => $data['title'],
                        'lang' => $data['lang'],
                        'edition_tokens' => $edition_tokenized,
                        'edition_lemmata' => $edition_lemmatized
                    ]
                ]
            ]);
        }
    }

    private function runLemmatizer(string $lang, string $text_encoded): array
    {
        exec("python3 ../../python/Lemmatizer_Indexing.py $lang $text_encoded", $tokens_and_lemmata);
        return $tokens_and_lemmata;
    }

    public function mustBeUnique(): bool
    {
        return true;
    }
}

<?php

namespace APM\Jobs;

use APM\CommandLine\EditionIndexCreator;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;

class ApiSearchUpdateIndexedEditions extends ApiSearchUpdateOpenSearchIndex implements JobHandlerInterface
{

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

        $eic = new EditionIndexCreator($config, 0, [0]);

        // Fetch data from payload
        $table_id = $payload[0];

        // Fetch indexing-relevant data from the SQL database
        $cTableManager = $sm->getCollationTableManager();
        $data = $eic->getEditionData($cTableManager, $table_id);

        if (!empty($data)) {
            
            // Clean edition data and check if edition already indexed
            $data = $eic->cleanEditionData([$data])[0];
            $editionStatus = $this->getEditionStatus($data);

            // Update index
            $this->updateIndex($eic, $editionStatus, $data);
        }

        return true;
    }

    private function getEditionStatus(array $data): array
    {
        $index_name = 'editions_' . $data['lang'];

        $query = $this->client->search([
            'index' => $index_name,
            'body' => [
                'size' => 20000,
                'query' => [
                    'bool' => [
                        'must' => [
                            'match' => [
                                'table_id' => $data['table_id']
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

    protected function updateIndex(EditionIndexCreator $eic, array $editionStatus, array $data): void
    {

        if ($editionStatus['exists'] === 0) { // New edition was created

            $opensearchID = $this->generateUniqueOpenSearchId($eic, $editionStatus['indexname']);
            $eic->indexEdition(
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

            $text_encoded = $eic->encodeForLemmatization($data['text']);
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

    public function mustBeUnique(): bool
    {
        return true;
    }
}

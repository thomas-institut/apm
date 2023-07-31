<?php

namespace APM\Jobs;

use APM\Api\ApiSearch;
use APM\CommandLine\EditionIndexCreator;
use APM\System\ApmConfigParameter;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use OpenSearch\ClientBuilder;
use PHPUnit\Util\Exception;
use function DI\string;

class ApiSearchUpdateEditionsOpenSearchIndex implements JobHandlerInterface

{
    public function run(SystemManager $sm, array $payload): bool
    {
        // Get logger and config data
        $logger = $sm->getLogger();
        $config = $sm->getConfig();

        // Instantiate OpenSearch client
        try {
            $this->client = (new ClientBuilder())
                ->setHosts($config[ApmConfigParameter::OPENSEARCH_HOSTS])
                ->setBasicAuthentication($config[ApmConfigParameter::OPENSEARCH_USER], $config[ApmConfigParameter::OPENSEARCH_PASSWORD])
                ->setSSLVerification(false) // For testing only. Use certificate for validation
                ->build();
        } catch (Exception $e) {
            $logger->debug('Connecting to OpenSearch server failed.');
            return false;
        }

        $editionIndexCreator = new EditionIndexCreator($config, 0, [0]);
        $table_id = $payload[0];
        $ctable = $sm->getCollationTableManager();
        $edition = $editionIndexCreator->getEditionData($ctable, $table_id);

        // If an edition and not only a collation table was modified or created
        if ($edition !== []) {

            $edition = $editionIndexCreator->cleanEditionData([$edition])[0];
            $editionStatus = $this->editionStatus($this->client, $table_id, $edition['lang']);

            if ($editionStatus['exists'] === 0) { // A new edition was created

                // Generate unique ID for new entry
                $opensearch_id_list = $editionIndexCreator->getIDs($this->client, $editionStatus['indexname']);
                $max_id = max($opensearch_id_list);
                $opensearch_id = $max_id + 1;

                // Index editions
                $editionIndexCreator->indexEdition($this->client, $opensearch_id, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id']);
                $log_data = 'Title: ' . $edition['title'] . ', Editor: ' . $edition['editor'] . ', Chunk: ' . $edition['chunk_id'];
                $logger->debug("Indexed Edition – $log_data\n");

            } else { // An existing edition was modified

                // Tokenize and lemmatize new edition
                $text_encoded = $editionIndexCreator->encodeForLemmatization($edition['text']);
                $lang = $edition['lang'];
                exec("python3 ../../python/Lemmatizer_Indexing.py $lang $text_encoded", $tokens_and_lemmata);

                // Get tokenized and lemmatized edition
                $edition_tokenized = explode("#", $tokens_and_lemmata[0]);
                $edition_lemmatized = explode("#", $tokens_and_lemmata[1]);

                // Update index
                $this->client->update([
                    'index' => $editionStatus['indexname'],
                    'id' => $editionStatus['id'],
                    'body' => [
                        'doc' => [
                            'table_id' => $table_id,
                            'chunk' => $edition['chunk_id'],
                            'creator' => $edition['editor'],
                            'title' => $edition['title'],
                            'lang' => $lang,
                            'edition_tokens' => $edition_tokenized,
                            'edition_lemmata' => $edition_lemmatized
                        ]
                    ]
                ]);
            }
        }

        return true;
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    private function editionStatus ($client, int $table_id, string $lang): array
    {

        $index_name = 'editions_' . $lang;

            $query = $client->search([
                'index' => $index_name,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        'bool' => [
                            'must' => [
                                'match' => [
                                    'table_id' => [
                                        "query" => $table_id
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]);

            $exists = $query['hits']['total']['value'];

            // Get id, if there is already an existing edition
            if ($exists === 1) {
                $opensearch_id = $query['hits']['hits'][0]['_id'];
            } else {
                $opensearch_id = 'null';
            }

        return ['exists' => $exists, 'id' => $opensearch_id, 'indexname' => $index_name];
    }

}
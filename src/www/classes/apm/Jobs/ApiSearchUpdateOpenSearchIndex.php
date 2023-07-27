<?php

namespace APM\Jobs;

use APM\System\ApmConfigParameter;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use OpenSearch\ClientBuilder;
use APM\CommandLine\TranscriptionIndexCreator;
use PHPUnit\Util\Exception;

class ApiSearchUpdateOpenSearchIndex implements JobHandlerInterface
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

        // Download hebrew language model for lemmatization
        exec("python3 ../../python/download_model_he.py", $model_status);

        // Get data from payload
        $doc_id = $payload['doc_id'];
        $page = $payload['page'];
        $col = $payload['col'];

        // Get instance of TranscriptionIndexCreator and all indexing-relevant data from the SQL database
        $indexcreator = new TranscriptionIndexCreator($config, 0, [0]); // HERE I AM UNSURE | The arguments are necessary, because TranscriptionIndexCreator is designed to be executed as a command line function, but not used here.
        $title = $indexcreator->getTitle($doc_id);
        $seq = $indexcreator->getSeq($doc_id, $page);
        $foliation = $indexcreator->getFoliation($doc_id, $page);
        $transcriber = $indexcreator->getTranscriber($doc_id, $page, $col);
        $page_id = $indexcreator->getPageID($doc_id, $page);
        $lang = $indexcreator->getLang($doc_id, $page);
        $transcript = $indexcreator->getTranscription($doc_id, $page, $col);

        // Check if a new transcription was made or an existing one was changed
        $transcription_status = $this->transcriptionStatus($this->client, $doc_id, $page, $col, $lang);

        // FIRST CASE – Completely new transcription was created
        if ($transcription_status['exists'] === 0) {

            // Generate unique ID for new entry
            $opensearch_id_list = $this->getIDs($this->client, $transcription_status['indexname']);
            $max_id = max($opensearch_id_list);
            $opensearch_id = $max_id + 1;

            // Add new transcription to index
            $indexcreator->indexTranscription($this->client, $opensearch_id, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcript, $lang);

        } else { // SECOND CASE – Existing transcription was changed

            // Get OpenSearch ID of changed column
            $opensearch_id = $transcription_status['id'];

            // Tokenize and lemmatize new transcription
            $transcript_encoded = $indexcreator->encode($transcript);
            exec("python3 ../../python/Lemmatizer_Indexing.py $lang $transcript_encoded", $tokens_and_lemmata);

            // Get tokenized and lemmatized transcript
            $transcript_tokenized = explode("#", $tokens_and_lemmata[0]);
            $transcript_lemmatized = explode("#", $tokens_and_lemmata[1]);

            // Update index
            $this->client->update([
                'index' => $transcription_status['indexname'],
                'id' => $opensearch_id,
                'body' => [
                    'doc' => [
                        'title' => $title,
                        'page' => $page,
                        'seq' => $seq,
                        'foliation' => $foliation,
                        'column' => $col,
                        'pageID' => $page_id,
                        'docID' => $doc_id,
                        'lang' => $lang,
                        'transcriber' => $transcriber,
                        'transcript' => $transcript,
                        'transcript_tokens' => $transcript_tokenized,
                        'transcript_lemmata' => $transcript_lemmatized
                    ]
                ]
            ]);

        }
            return true;
    }

    // Function to get a full list of all OpenSearch-IDs in the index
    protected function getIDs ($client, string $index_name): array
    {

        // Array to return
        $opensearch_ids = [];

        // Make a match_all query
        $query = $client->search([
            'index' => $index_name,
            'size' => 20000,
            'body' => [
                "query" => [
                    "match_all" => [
                        "boost" => 1.0
                    ]
                ],
            ]
        ]);

        // Append every id to the $opensearch_ids-array
        foreach ($query['hits']['hits'] as $column) {
            $opensearch_id = $column['_id'];
            $opensearch_ids[] = $opensearch_id;
        }

        return $opensearch_ids;
    }

    // Function to check if a transcript already exists in a given OpenSearch-index – if yes, returns also its OpenSearch-ID
    protected function transcriptionStatus ($client, string $doc_id, string $page, string $col, string $lang): array
    {
        $index_name = 'transcriptions_' . $lang;

            $query = $client->search([
                'index' => $index_name,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        'bool' => [
                            'filter' => [
                                'match' => [
                                    'docID' => [
                                        "query" => $doc_id
                                    ]
                                ]
                            ],
                            'should' => [
                                'match' => [
                                    'page' => [
                                        "query" => $page,
                                    ]
                                ]
                            ],
                            "minimum_should_match" => 1,
                            'must' => [
                                'match' => [
                                    'column' => [
                                        "query" => $col
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]);

            $exists = $query['hits']['total']['value'];

            // Get id, if there is already an existing transcription
            if ($exists === 1) {
                $opensearch_id = $query['hits']['hits'][0]['_id'];
            } else {
                $opensearch_id = 'null';
            }

        return ['exists' => $exists, 'id' => $opensearch_id, 'indexname' => $index_name];
    }

public function mustBeUnique(): bool
    {
        return true;
    }

}
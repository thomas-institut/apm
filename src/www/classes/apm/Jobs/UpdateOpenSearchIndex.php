<?php

namespace APM\Jobs;

use APM\System\ApmConfigParameter;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use OpenSearch\ClientBuilder;
use APM\CommandLine\IndexCreator;

class UpdateOpenSearchIndex implements JobHandlerInterface
{
    public function run(SystemManager $sm, array $payload): bool
    {

        $config = $this->$sm->getConfig();

        // Instantiate OpenSearch client
        $this->client = (new ClientBuilder())
            ->setHosts($config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($config[ApmConfigParameter::OPENSEARCH_USER], $config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Name of the index in OpenSearch
        $this->indexName = 'transcripts';

        // Download hebrew language model for lemmatization
        exec("python3 ../../python/download_model_he.py", $model_status);

        // Get data from payload
        $doc_id = $payload['doc_id'];
        $page = $payload['page'];
        $col = $payload['col'];

        // Get all indexing-relevant data from the SQL database
        $indexcreator = new IndexCreator();
        $title = $indexcreator->getTitle($doc_id);
        $seq = $indexcreator->getSeq($doc_id, $page);
        $foliation = $indexcreator->getFoliation($doc_id, $page);
        $transcriber = $indexcreator->getTranscriber($doc_id, $page, $col);
        $page_id = $indexcreator->getPageID($doc_id, $page);
        $lang = $indexcreator->getLang($doc_id, $page);
        $transcript = $indexcreator->getTranscript ($doc_id, $page, $col);

        // Check if a new transcription was made or an existing one was changed
        $transcription_status = $this->transcriptionStatus($this->client, $this->indexName, $doc_id, $page, $col);

        // FIRST CASE – Completely new transcription was created
        if ($transcription_status['exists'] === 0) {

            // Generate unique ID for new entry
            $opensearch_id_list = $this->getIDs($this->client, $this->indexName);
            $max_id = max($opensearch_id_list);
            $opensearch_id = $max_id + 1;

            // Add new transcription to index
            $indexcreator->indexCol($opensearch_id, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcript, $lang);
        } else { // SECOND CASE – Existing transcription was changed

            // Get OpenSearch ID of changed column
            $opensearch_id = $transcription_status['id'];

            // Tokenize and lemmatize new transcription
            $transcript_clean = $indexcreator->encode($transcript);
            exec("python3 ../../python/Lemmatizer_Indexing.py $lang $transcript_clean", $tokens_and_lemmata);

            // Get tokenized and lemmatized transcript
            $transcript_tokenized = explode("#", $tokens_and_lemmata[0]);
            $transcript_lemmatized = explode("#", $tokens_and_lemmata[1]);

            // Update index
            $this->client->update([
                'index' => $this->indexName,
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

    // Function to get a full list of OpenSearch-IDs in the index
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

    // Function to query a given OpenSearch-index
    protected function transcriptionStatus ($client, string $index_name, string $doc_id, string $page, string $col): array
    {

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
            $opensearch_id = 'None';
        }

        return ['exists' => $exists, 'id' => $opensearch_id];
    }

public function mustBeUnique(): bool
    {
        return true;
    }

}
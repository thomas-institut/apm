<?php

namespace APM\Jobs;

use APM\System\ApmConfigParameter;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use OpenSearch\ClientBuilder;
use APM\CommandLine\TranscriptionIndexCreator;

class ApiSearchUpdateTranscriptionOpenSearchIndex implements JobHandlerInterface
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

        // Fetch data from payload
        $doc_id = $payload['doc_id'];
        $page = $payload['page'];
        $col = $payload['col'];

        // Fetch indexing-relevant data from the SQL database
        $tic = new TranscriptionIndexCreator($config, 0, [0]);
        $data = $this->fetchTranscriptionData($tic, $doc_id, $page, $col);

        // Check if a new transcription was created or an existing one was changed
        $transcription_status = $this->getTranscriptionStatus($this->client, $data);

        // Update or create entry in index
        $this->updateIndex($tic, $transcription_status, $data);

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

    // Fetch relevant data from the SQL database
    private function fetchTranscriptionData(TranscriptionIndexCreator $tic, string $doc_id, string $page, string $col): array
    {
        $title = $tic->getTitle($doc_id);
        $seq = $tic->getSeq($doc_id, $page);
        $foliation = $tic->getFoliation($doc_id, $page);
        $transcriber = $tic->getTranscriber($doc_id, $page, $col);
        $page_id = $tic->getPageID($doc_id, $page);
        $lang = $tic->getLang($doc_id, $page);
        $transcription = $tic->getTranscription($doc_id, $page, $col);

        return compact('title', 
            'page', 'seq', 'foliation', 'col', 'transcriber', 'page_id', 'doc_id', 'transcription', 'lang');
    }

    private function getTranscriptionStatus($client, array $data): array
    {
        $index_name = 'transcriptions_' . $data['lang'];

        $query = $client->search([
            'index' => $index_name,
            'body' => [
                'size' => 20000,
                'query' => [
                    'bool' => [
                        'filter' => [
                            'match' => [
                                'docID' => [
                                    "query" => $data['doc_id']
                                ]
                            ]
                        ],
                        'should' => [
                            'match' => [
                                'page' => [
                                    "query" => $data['page'],
                                ]
                            ]
                        ],
                        "minimum_should_match" => 1,
                        'must' => [
                            'match' => [
                                'column' => [
                                    "query" => $data['col']
                                ]
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

    private function updateIndex(TranscriptionIndexCreator $tic, array $transcription_status, array $data): void
    {
        if ($transcription_status['exists'] === 0) {
            // Completely new transcription was created
            $existingIDs = $tic->getIDs($this->client, $transcription_status['indexname']);
            $max_id = max($existingIDs);
            $opensearchID = $max_id + 1;
            $tic->indexTranscription($this->client, $opensearchID, ...$data);
        } else {
            // Existing transcription was changed
            $transcription_encoded = $tic->encodeForLemmatization($data['transcription']);
            $tokens_and_lemmata = $this->runLemmatizer($data['lang'], $transcription_encoded);

            // Get tokenized and lemmatized transcript
            $transcription_tokenized = explode("#", $tokens_and_lemmata[0]);
            $transcription_lemmatized = explode("#", $tokens_and_lemmata[1]);

            $this->client->update([
                'index' => $transcription_status['indexname'],
                'id' => $transcription_status['id'],
                'body' => [
                    'doc' => [
                        'title' => $data['title'],
                        'page' => $data['page'],
                        'seq' => $data['seq'],
                        'foliation' => $data['foliation'],
                        'column' => $data['col'],
                        'pageID' => $data['page_id'],
                        'docID' => $data['doc_id'],
                        'lang' => $data['lang'],
                        'creator' => $data['transcriber'],
                        'transcription_tokens' => $transcription_tokenized,
                        'transcription_lemmata' => $transcription_lemmatized
                    ]
                ]
            ]);
        }
    }

    private function runLemmatizer(string $lang, string $transcription_encoded): array
    {
        // Use proper PHP library or built-in function to execute Python script if available.
        // This example keeps the existing code but note that using `exec` is not recommended in production environments.
        exec("python3 ../../python/Lemmatizer_Indexing.py $lang $transcription_encoded", $tokens_and_lemmata);
        return $tokens_and_lemmata;
    }

    public function mustBeUnique(): bool
    {
        return true;
    }
}

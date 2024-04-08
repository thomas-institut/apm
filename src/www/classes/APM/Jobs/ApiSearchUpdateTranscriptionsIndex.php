<?php

namespace APM\Jobs;

use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use APM\CommandLine\TranscriptionsIndexManager;

class ApiSearchUpdateTranscriptionsIndex extends ApiSearchUpdateOpenSearchIndex implements JobHandlerInterface
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

        // Fetch data from payload
        $doc_id = $payload['doc_id'];
        $page = $payload['page'];
        $col = $payload['col'];

        // Fetch indexing-relevant data from the SQL database
        $tic = new TranscriptionsIndexManager($config, 0, [0]);
        $data = $this->fetchTranscriptionData($tic, $doc_id, $page, $col);

        // Check if a new transcription was created or an existing one was changed
        $transcription_status = $this->getTranscriptionStatus($this->client, $data);

        // Update index with modified or newly created transcription
        $this->updateIndex($tic, $transcription_status, $data);

        return true;
    }

    // Fetch relevant data from the SQL database
    private function fetchTranscriptionData(TranscriptionsIndexManager $tic, string $doc_id, string $page, string $col): array
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

    protected function updateIndex(TranscriptionsIndexManager $tic, array $transcription_status, array $data): void
    {
        if ($transcription_status['exists'] === 0) { // Completely new transcription was created

            $opensearchID = $this->generateUniqueOpenSearchId($tic, $transcription_status['indexname']);
            $tic->indexTranscription($this->client, $opensearchID, ...$data);

        } else { // Existing transcription was changed

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

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}

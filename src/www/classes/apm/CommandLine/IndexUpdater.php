<?php


/*
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

namespace APM\CommandLine;

use APM\System\ApmConfigParameter;
use APM\System\OpenSearchScheduler;
use OpenSearch\ClientBuilder;

/**
 * Description of UpdateIndex
 *
 * Commandline utility to update the OpenSearch-index with all transcripts that are scheduled in the SQL-table ,scheduler'.
 *
 * REQUIREMENTS
 * 1. There has to exist an index in OpenSearch called ,transcripts'. Therefore execute ./createindex in the utilities-directory.
 * 2. The SQL table ap_scheduler has to be created before with the right structure. (see OpenSearchScheduler-class)
 * 3. Because ./updateindex will be triggered via cron, add the following line to your root crontab (sudo crontab -e). Replace 'ASTERISK' with '*':

 * * * * * p=$(find /home -path "ASTERISK/apm/src/www/utilities"); cd "${p}"; ./updateindex

 *
 * @author Lukas Reichert
 */

class IndexUpdater extends IndexCreator
{

    public function main($argc, $argv): bool
    {
        $scheduler = $this->systemManager->getOpenSearchScheduler();

        // Instantiate OpenSearch client
        $this->client = (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Name of the index in OpenSearch
        $this->indexName = 'transcripts';

        // Download hebrew language model for lemmatization
        exec("python3 ../../python/download_model_he.py", $model_status);

        // TEST DATA FOR NEW ENTRY - SHOULD BE RECEIVED FROM SCHEDULER SQL DATABASE
        $rows_waiting = $scheduler->read();

        // Iterate over all rows
        foreach ($rows_waiting as $row) {

            $schedule_id = $row['id'];
            $doc_id = $row['doc_id'];
            $page = $row['page'];
            $col = $row['col'];

            $this->logger->debug("Processing scheduler row $schedule_id: docID $doc_id page $page col $col");
            // TODO:
            //  Here is where we should mark that the row is actually being processed

            // Get all indexing-relevant data from the SQL database
            $title = $this->getTitle($doc_id);
            $seq = $this->getSeq($doc_id, $page);
            $foliation = $this->getFoliation($doc_id, $page);
            $transcriber = $this->getTranscriber($doc_id, $page, $col);
            $page_id = $this->getPageID($doc_id, $page);
            $lang = $this->getLang($doc_id, $page);
            $transcript = $this->getTranscript ($doc_id, $page, $col);

            // Check if a new transcription was made or an existing one was changed
            $transcription_status = $this->transcriptionStatus($this->client, $this->indexName, $doc_id, $page, $col);


            // TODO: add error processing
            //  With the current code, if there's an error while indexing (for example, if OpenSearch is not running, the row
            //  will just stay in the PROCESSING state. It should rather be marked as being in an
            //  ERROR state; the scheduler might just want to attempt to index the next time it runs
            //  Also: we should be able to detect and report that OpenSearch is not running

            // FIRST CASE – Completely new transcription was created
            if ($transcription_status['exists'] === 0) {

                // Generate unique ID for new entry
                $opensearch_id_list = $this->getIDs($this->client, $this->indexName);
                $max_id = max($opensearch_id_list);
                $opensearch_id = $max_id + 1;

                // Add new transcription to index
                $this->indexCol($opensearch_id, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcript, $lang);
                $scheduler->log($schedule_id, $opensearch_id, 'CREATED');
            } else { // SECOND CASE – Existing transcription was changed

                // Get OpenSearch ID of changed column
                $opensearch_id = $transcription_status['id'];

                // Tokenize and lemmatize new transcription
                $transcript_clean = $this->encode($transcript);
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

                // TODO: check this
                //  This is when we must mark the row as processed with the current time
                // Log in SQL, that processing is  finished
                $scheduler->log($schedule_id, $opensearch_id, OpenSearchScheduler::STATE_PROCESSED);
            }
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
}

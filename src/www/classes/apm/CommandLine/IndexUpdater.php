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
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item;
use OpenSearch\Client;
use OpenSearch\ClientBuilder;

/**
 * Description of UpdateIndex
 *
 * Commandline utility to update the index of all transcripts in OpenSearch
 *
 * @author Lukas Reichert
 */

class IndexUpdater extends IndexCreater
{

    public function main($argc, $argv): bool
    {
        //$oss = $this->systemManager->getOpenSearchScheduler();
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
        $doc_id = "15432";
        $page = "402";
        $col = "2";

        // Get all indexing-relevant data from the SQL database
        /*$title = $this->getTitle($doc_id);
        $seq = $this->getSeq($doc_id, $page);
        $foliation = $this->getFoliation($doc_id, $page);
        $transcriber = $this->getTranscriber($doc_id, $page, $col);
        $page_id = $this->getPageID($doc_id, $page);
        $lang = $this->getLang($doc_id, $page);
        $transcript = $this->getTranscript ($doc_id, $page, $col);*/

        // FOR TESTING
        $title = "Hallo";
        $seq = "67";
        $foliation = "50b";
        $transcriber = "Brad Pitt";
        $page_id = "34";
        $lang = "la";
        $transcript = "Hic philosophum est et homo non potest dicere et non habitat in curia curiosum curiositate.";

        // Check if a new transcription was made or an existing one was changed
        $transcription_status = $this->transcriptionStatus($this->client, $this->indexName, $doc_id, $page, $col);

        // FIRST CASE – Completely new transcription was created
        if ($transcription_status['exists'] === 0) {

            // Generate unique ID for new entry
            $id_list = $this->getIDs($this->client, $this->indexName);
            $max_id = max($id_list);
            $id = $max_id + 1;

            // Add new transcription to index
            $this->indexCol($id, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcript, $lang);
            print("Indexed Document – OpenSearch ID: $id: Doc ID: $doc_id ($title) Page: $page Seq: $seq Foliation: $foliation Column: $col Lang: $lang\n");
        }
        else { // SECOND CASE – Existing transcription was changed

            // Get OpenSearch ID of changed column
            $id = $transcription_status['id'];

            // Tokenize and lemmatize new transcription
            $transcript_clean = $this->encode($transcript);
            exec("python3 ../../python/Lemmatizer_Indexing.py $lang $transcript_clean", $tokens_and_lemmata);

            // Get tokenized and lemmatized transcript
            $transcript_tokenized = explode("#", $tokens_and_lemmata[0]);
            $transcript_lemmatized = explode("#", $tokens_and_lemmata[1]);

            // Update index
            $this->client->update([
                'index' => $this->indexName,
                'id' => $id,
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

            print("Updated Document – OpenSearch ID: $id: Doc ID: $doc_id ($title) Page: $page Seq: $seq Foliation: $foliation Column: $col Lang: $lang\n");
        }
        return true;
    }

    // Function to get a full list of OpenSearch-IDs in the index
    private function getIDs ($client, $index_name) {

        // Array to return
        $ids = [];

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

        // Append every id to the $ids-array
        foreach ($query['hits']['hits'] as $column) {
            $id = $column['_id'];
            $ids[] = $id;
        }

        return $ids;
    }

    // Function to query a given OpenSearch-index
    private function transcriptionStatus ($client, $index_name, $doc_id, $page, $col) {

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
                $id = $query['hits']['hits'][0]['_id'];
            } else {
                $id = 'None';
            }

            return ['exists' => $exists, 'id' => $id];
    }
}

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
 * Description of IndexCreator
 *
 * Commandline utility to create an index of all transcripts in OpenSearch based on a sql-database
 * Transcript will be lemmatized before indexing. All relevant data and metadata will be indexed.
 *
 * @author Lukas Reichert
 */

class IndexCreator extends CommandLineUtility {

    // Variables for OpenSearch client and the name of the index to create
    public Client $client;
    public string $indexName;

    public function main($argc, $argv): bool
    {
        // Instantiate OpenSearch client
        $this->client =  (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Name of the index in OpenSearch
        $this->indexName = 'transcripts';

        // Delete existing and create new index
        if ($this->client->indices()->exists(['index' => $this->indexName])) {
            $this->client->indices()->delete([
                'index' => $this->indexName
            ]);
            $this->logger->debug("Existing index *$this->indexName* was deleted!\n");
        }

       $this->client->indices()->create([
            'index' => $this->indexName,
            'body' => [
                'settings' => [
                    'index' => [
                        'max_result_window' => 50000
                    ]
                ]
            ]
        ]);

        $this->logger->debug("New index *$this->indexName* was created!\n");

        // Get a list of all docIDs in the sql-database
        $doc_list = $this->dm->getDocIdList('title');

        // Variable to add a unique id to the indexed columns
        $id = 0;

        // Download hebrew language model for lemmatization
        exec("python3 ../../python/download_model_he.py", $model_status);
        $this->logger->debug($model_status[0]);

        $this->logger->debug("Start indexing...\n");

        // Iterate over all docIDs
        foreach ($doc_list as $doc_id) {
            // Get title of every document
            $title = $this->getTitle($doc_id);

            // Get a list of transcribed pages of the document
            $pages_transcribed = $this->dm->getTranscribedPageListByDocId($doc_id);

            // Iterate over transcribed pages
            foreach ($pages_transcribed as $page) {

                // Get pageID, number of columns and sequence number of the page
                $page_id = $this->getPageID($doc_id, $page);
                $page_info = $this->dm->getPageInfo($page_id);
                $num_cols = $page_info['num_cols'];
                $seq = $this->getSeq($doc_id, $page);

                // Iterate over all columns of the page and get the corresponding transcripts and transcribers
                for ($col = 1; $col <= $num_cols; $col++) {
                    $versions = $this->dm->getTranscriptionVersionsWithAuthorInfo($page_id, $col);
                    if (count($versions) === 0) {
                        // no transcription in this column
                        continue;
                    }

                    $transcript = $this->getTranscript($doc_id, $page, $col);
                    $transcriber = $this->getTranscriber($doc_id, $page, $col);

                    // Get language of current column (same as document)
                    $lang = $this->getLang($doc_id, $page);

                    // Get foliation number of the current page/sequence number
                    $foliation = $this->getFoliation($doc_id, $page);

                    // Add data to the OpenSearch index with a unique id
                    $id = $id + 1;

                    $this->indexCol($this->client, $this->indexName, $id, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcript, $lang);
                }
            }
        }
    return true;
    }

    // Function to get plaintext of the transcripts in the sql-database (copied from the ApiTranscription class)
    private function getPlainTextFromElements($elements) : string {
        $text = '';
        foreach($elements as $element) {
            if ($element->type === Element::LINE) {
                foreach($element->items as $item) {
                    switch($item->type) {
                        case Item::TEXT:
                        case Item::HEADING:
                        case Item::RUBRIC:
                        case Item::BOLD_TEXT:
                        case Item::ITALIC:
                        case Item::MATH_TEXT:
                        case Item::GLIPH:
                        case Item::INITIAL:
                            $text .= $item->theText;
                            break;

                        case Item::NO_WORD_BREAK:
                            $text .= '-';
                            break;


                    }
                }
                $text .=  "\n";
            }
        }
        return $text;
    }

    public function getPageID (string $doc_id, string $page): string {
        return $this->dm->getpageIDByDocPage($doc_id, $page);
    }

    public function getTitle(string $doc_id): string {
        $doc_info = $this->dm->getDocById($doc_id);
        return $doc_info['title'];
    }

    public function getSeq(string $doc_id, string $page): string {
        $page_id = $this->dm->getpageIDByDocPage($doc_id, $page);
        $page_info = $this->dm->getPageInfo($page_id);
        return $page_info['seq'];
    }


    public function getTranscript(string $doc_id, string $page, string $col): string {
        $page_id = $this->dm->getpageIDByDocPage($doc_id, $page);
        $elements = $this->dm->getColumnElementsBypageID($page_id, $col);
        return $this->getPlainTextFromElements($elements);
    }

    public function getTranscriber(string $doc_id, string $page, string $col): string {
        $page_id = $this->dm->getpageIDByDocPage($doc_id, $page);
        $versions = $this->dm->getTranscriptionVersionsWithAuthorInfo($page_id, $col);
        if ($versions === []) {
            return '';
        }
        else {
            $latest_version = count($versions) - 1;
            $transcriber = $versions[$latest_version]['author_name'];
            return $transcriber;
        }
    }

    public function getLang(string $doc_id, string $page): string {
        $seq = $this->getSeq($doc_id, $page);
        return $this->dm->getPageInfoByDocSeq($doc_id, $seq)['lang'];
    }

    public function getFoliation(string $doc_id, string $page): string
    {
        $seq = $this->getSeq($doc_id, $page);
        return $this->dm->getPageFoliationByDocSeq($doc_id,  $seq);
    }

    // Function to add pages to the OpenSearch index
    public function indexCol ($client, string $indexName, string $id, string $title, string $page, string $seq, string $foliation, string $col, string $transcriber,
                                 string $page_id, string $doc_id, string $transcript, string $lang): bool {

        // Encode transcript for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $transcript_encoded = $this->encode($transcript);

        // Tokenization and lemmatization
        // Test existence of transcript and tokenize/lemmatize existing transcripts in python
        if (strlen($transcript_encoded) > 3) {
                exec("python3 ../../python/Lemmatizer_Indexing.py $lang $transcript_encoded", $tokens_and_lemmata);

                // Get tokenized and lemmatized transcript
                $transcript_tokenized = explode("#", $tokens_and_lemmata[0]);
                $transcript_lemmatized = explode("#", $tokens_and_lemmata[1]);
            }
            else {
                $transcript_tokenized = [];
                $transcript_lemmatized = [];
                $this->logger->debug("Transcript is too short for lemmatization...");
            }
            if (count($transcript_tokenized) !== count($transcript_lemmatized)) {
                $this->logger->debug("Error! Array of tokens and lemmata do not have the same length!\n");
            }

            // Data to be stored on the OpenSearch index
        $client->create([
            'index' => $indexName,
            'id' => $id,
            'body' => [
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
        ]);

        $this->logger->debug("Indexed Document – OpenSearch ID: $id: Doc ID: $doc_id ($title) Page: $page Seq: $seq Foliation: $foliation Column: $col Transcriber: $transcriber Lang: $lang\n");
        return true;
    }

    // Function to encode the transcript – makes it suitable for the exec-command
    public function encode(string $transcript): string {

        // Replace line breaks, blanks, brackets...these character can provoke errors in the exec-command
        $transcript_encoded = str_replace("\n", "#", $transcript);
        $transcript_encoded = str_replace(".", " .", $transcript_encoded);
        $transcript_encoded = str_replace(",", " ,", $transcript_encoded);
        $transcript_encoded = str_replace(" ", "#", $transcript_encoded);
        $transcript_encoded = str_replace("(", "%", $transcript_encoded);
        $transcript_encoded = str_replace(")", "§", $transcript_encoded);
        $transcript_encoded = str_replace("׳", "€", $transcript_encoded);
        $transcript_encoded = str_replace("'", "\'", $transcript_encoded);
        $transcript_encoded = str_replace("\"", "\\\"", $transcript_encoded);
        $transcript_encoded = str_replace(' ', '#', $transcript_encoded);
        $transcript_encoded = str_replace(' ', '#', $transcript_encoded);
        $transcript_encoded = str_replace('T.', '', $transcript_encoded);
        $transcript_encoded = str_replace('|', '+', $transcript_encoded);
        $transcript_encoded = str_replace('<', '°', $transcript_encoded);
        $transcript_encoded = str_replace('>', '^', $transcript_encoded);
        $transcript_encoded = str_replace(';', 'ß', $transcript_encoded);
        $transcript_encoded = str_replace('`', '~', $transcript_encoded);
        $transcript_encoded = str_replace('[', '', $transcript_encoded);
        $transcript_encoded = str_replace(']', '', $transcript_encoded);


        // Remove numbers
        for ($i=0; $i<10; $i++) {
            $transcript_encoded = str_replace("$i", '', $transcript_encoded);
        }

        // Remove repetitions of hashtags
        while (strpos($transcript_encoded, '##') !== false) {
            $transcript_encoded = str_replace('##', '#', $transcript_encoded);
        }

        // Remove repetitions of periods
        while (strpos($transcript_encoded, '.#.') !== false) {
            $transcript_encoded = str_replace('.#.', '', $transcript_encoded);
        }

        while (strpos($transcript_encoded, '..') !== false) {
            $transcript_encoded = str_replace('..', '', $transcript_encoded);
        }

        // Remove repetitions of hashtags again (in the foregoing steps could be originated new ones..)
        while (strpos($transcript_encoded, '##') !== false) {
            $transcript_encoded = str_replace('##', '#', $transcript_encoded);
        }

        // Transcript should not begin or end with hashtag
        if (substr($transcript_encoded, 0, 1) === '#') {
                $transcript_encoded = substr($transcript_encoded, 1);
            }

        if (substr($transcript_encoded, -1, 1) === '#') {
            $transcript_encoded = substr($transcript_encoded, 0, -1);
            }

        return $transcript_encoded;
    }
}

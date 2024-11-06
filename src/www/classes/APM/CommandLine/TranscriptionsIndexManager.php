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

use APM\FullTranscription\ApmColumnVersionManager;
use APM\System\ApmConfigParameter;
use APM\System\PythonLemmatizer;
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item;
use OpenSearch\ClientBuilder;
use function DI\string;

/**
 * Description of IndexDocs
 *
 * Commandline utility to create an index of all transcripts in OpenSearch based on a sql-database
 * Transcript will be lemmatized before indexing. All relevant data and metadata will be indexed.
 *
 * @author Lukas Reichert
 */

class TranscriptionsIndexManager extends OpenSearchIndexManager {

    public function main($argc, $argv): bool
    {
        // Instantiate OpenSearch client
        $this->client =  (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Name of the indices in OpenSearch
        $this->indices = ['transcriptions_la', 'transcriptions_ar', 'transcriptions_he'];

        // Delete existing and create new index
        foreach ($this->indices as $indexName) {
            $this->resetIndex($this->client, $indexName);
        }
        
        // Get a list of all docIDs in the sql-database
        $doc_list = $this->getDm()->getDocIdList('title');


        // Download hebrew language model for lemmatization
        exec("python3 ../../python/download_model_he.py", $model_status);
        $this->logger->debug($model_status[0]);

        $this->logger->debug("Start indexing...\n");

        $id = 0;

        // Get all relevant data for every transcription and index it
        foreach ($doc_list as $doc_id) {
            // $id will be indexed as open-search-id
            $id = $this->getAndIndexTranscriptionData($doc_id, $id)+1;
        }
        return true;
    }

    private function getAndIndexTranscriptionData (string $doc_id, int $id): int
    {

        $title = $this->getTitle($doc_id);

        // Get a list of transcribed pages of the document
        $pages_transcribed = $this->getDm()->getTranscribedPageListByDocId($doc_id);

        // Iterate over transcribed pages
        foreach ($pages_transcribed as $page) {

            // Get pageID, number of columns and sequence number of the page
            $page_id = $this->getPageID($doc_id, $page);
            $page_info = $this->getDm()->getPageInfo($page_id);
            $num_cols = $page_info['num_cols'];
            $seq = $this->getSeq($doc_id, $page);

            // Iterate over all columns of the page and get the corresponding transcripts and transcribers
            for ($col = 1; $col <= $num_cols; $col++) {
                $versions = $this->getDm()->getTranscriptionVersionsWithAuthorInfo($page_id, $col);
                if (count($versions) === 0) {
                    // no transcription in this column
                    continue;
                }

                $transcription = $this->getTranscription($doc_id, $page, $col);
                $transcriber = $this->getTranscriber($doc_id, $page, $col);

                // Get language of current column (same as document)
                $lang = $this->getLang($doc_id, $page);

                // Get foliation number of the current page/sequence number
                $foliation = $this->getFoliation($doc_id, $page);

                // Get timestamp
                $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();
                $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($page_id, $col);
                $currentVersionInfo = (array) (end($versionsInfo));
                $timeFrom = (string) $currentVersionInfo['timeFrom'];

                $this->indexTranscription($this->client, $id, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcription, $lang, $timeFrom);
                $id=$id+1;
            }
        }

        return $id;
    }

    // Function to get plaintext of the transcripts in the sql-database (copied from the ApiTranscription class)
    private function getPlainTextFromElements(array $elements) : string {
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

    public function getPageID (int $doc_id, int $page): int {
        return $this->getDm()->getpageIDByDocPage($doc_id, $page);
    }

    public function getTitle(int $doc_id): string {
        $doc_info = $this->getDm()->getDocById($doc_id);
        return $doc_info['title'];
    }

    public function getSeq(int $doc_id, int $page): string {
        $page_id = $this->getDm()->getpageIDByDocPage($doc_id, $page);
        $page_info = $this->getDm()->getPageInfo($page_id);
        return $page_info['seq'];
    }

    public function getTranscription(int $doc_id, int $page, int $col): string
    {
        $page_id = $this->getDm()->getpageIDByDocPage($doc_id, $page);
        $elements = $this->getDm()->getColumnElementsBypageID($page_id, $col);
        return $this->getPlainTextFromElements($elements);
    }

    public function getTranscriber(int $doc_id, int $page, int $col): string {
        $page_id = $this->getDm()->getpageIDByDocPage($doc_id, $page);
        $versions = $this->getDm()->getTranscriptionVersionsWithAuthorInfo($page_id, $col);
        if ($versions === []) {
            return '';
        }
        else {
            $latest_version = count($versions) - 1;
            return $versions[$latest_version]['author_name'];
        }
    }

    public function getLang(int $doc_id, int $page): string {
        $seq = $this->getSeq($doc_id, $page);
        return $this->getDm()->getPageInfoByDocSeq($doc_id, $seq)['lang'];
    }

    public function getFoliation(int $doc_id, int $page): string
    {
        $seq = $this->getSeq($doc_id, $page);
        return $this->getDm()->getPageFoliationByDocSeq($doc_id,  $seq);
    }

    // Function to add pages to the OpenSearch index
    public function indexTranscription ($client, int $id, string $title, int $page, int $seq, string $foliation, int $col, string $transcriber, int $page_id, int $doc_id, string $transcription, string $lang, string $timeFrom): bool
    {

        if ($lang != 'jrb') {
            $indexName = 'transcriptions_' . $lang;
        }
        else {
            $indexName = 'transcriptions_he';
        }

        // Encode transcript for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $transcription_clean = $this->encodeForLemmatization($transcription);

        // Tokenization and lemmatization
        // Test existence of transcript and tokenize/lemmatize existing transcripts in python
        if (strlen($transcription_clean) > 3) {
            PythonLemmatizer::runLemmatizer($lang, $transcription_clean, $tokens_and_lemmata);
//            exec("python3 ../../python/Lemmatizer_Indexing.py $lang $transcription_clean", $tokens_and_lemmata);

            // Get tokenized and lemmatized transcript
            $transcription_tokenized = explode("#", $tokens_and_lemmata[0]);
            $transcription_lemmatized = explode("#", $tokens_and_lemmata[1]);
        }
        else {
            $transcription_tokenized = [];
            $transcription_lemmatized = [];
            $this->logger->debug("Transcript is too short for lemmatization...");
        }
        if (count($transcription_tokenized) !== count($transcription_lemmatized)) {
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
                'creator' => $transcriber,
                'transcription_tokens' => $transcription_tokenized,
                'transcription_lemmata' => $transcription_lemmatized,
                'time_from' => $timeFrom
            ]
        ]);

        $this->logger->debug("Indexed Document in $indexName – OpenSearch ID: $id: Doc ID: $doc_id ($title) Page: $page Seq: $seq Foliation: $foliation Column: $col Transcriber: $transcriber Lang: $lang TimeFrom: $timeFrom\n");
        return true;
    }
}

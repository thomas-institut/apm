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

use APM\CollationTable\CollationTableManager;
use APM\FullTranscription\ApmColumnVersionManager;
use APM\System\ApmConfigParameter;
use APM\System\Lemmatizer;
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item;
use Exception;
use OpenSearch\ClientBuilder;
use function DI\string;

/**
 * Description of IndexManager
 *
 * Commandline utility to manage Open Search indices.
 *
 * @author Lukas Reichert
 */

class IndexManager extends CommandLineUtility {

    public function main($argc, $argv): bool
    {
        print ("Welcome to the Index Manager!\n");

        // Instantiate OpenSearch client
        $this->client =  (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // get desired operation and indexNamePrefix
        $operation = $argv[1];
        $this->indexNamePrefix = $argv[2];

        // Name of the indices in OpenSearch
        $this->indices = [$this->indexNamePrefix . '_la', $this->indexNamePrefix . '_ar', $this->indexNamePrefix . '_he'];

        print ("You chose to $operation $this->indexNamePrefix.\n");

        switch ($operation) {
            case 'build': // create new or replace existing index with a specific name
                $this->rebuildIndex();
                break;
            case 'check': // check if a specific index mirrors all data from the sql database
                $this->checkIndex();
                break;
            case 'add': // adds a new single doc to an index
                $pageID = $argv[3];
                $col = $argv[4];
                $this->addDoc($pageID, $col);
                break;
            case 'update': // updates an existing doc in an index
                $pageID = $argv[3];
                $col = $argv[4];
                $this->updateDoc($pageID, $col);
                break;
            case 'remove': // removes a doc from an index
                $pageID = $argv[3];
                $col = $argv[4];
                $this->removeDoc($pageID, $col);
                break;
        }

        return true;
    }

    private function rebuildIndex () {
        // Delete existing and create new index
        foreach ($this->indices as $indexName) {
            $this->resetIndex($this->client, $indexName);
        }

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                $this->rebuildIndexTranscriptions();
                break;
            case 'editions':
                $this->rebuildIndexEditions();
                break;
        }
    }

    private function rebuildIndexTranscriptions() {
        // Get a list of all docIDs in the sql-database
        $doc_list = $this->getDm()->getDocIdList('title');

        $this->logger->debug("Building index...\n");

        $id = 0;

        // Get all relevant data for every transcription and index it
        foreach ($doc_list as $doc_id) {
            // $id will be indexed as open-search-id

            //if ($doc_id === 23) { // 142 for arabic test, 23 for latin, 49 for hebrew
            $id = $this->getAndIndexTranscriptionData($doc_id, $id) + 1;
            //}
        }
        return true;
    }

    private function rebuildIndexEditions() {
        // Get collationTableManager
        $this->collationTableManager = $this->getSystemManager()->getCollationTableManager();

        // Get the data of up to 20 000 editions
        $editions = [];
        foreach (range(1, 20000) as $id) {
            try {
                $editions[] = $this->getEditionData($this->collationTableManager, $id);
            } catch (Exception) {
                $num_editions = $id-1;
                $this->logger->debug("Found $num_editions potential editions.");
                break;
            }
            return true;
        }

        // Clean data
        $editions = $this->cleanEditionData($editions);
        $num_editions = count($editions);
        $this->logger->debug("Found $num_editions actual editions.");

        // Index editions
        foreach ($editions as $id => $edition) {
            $this->indexEdition ($this->client, $id, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id']);
            $log_data = 'Title: ' . $edition['title'] . ', Editor: ' . $edition['editor'] . ', Chunk: ' . $edition['chunk_id'];
            $this->logger->debug("Indexed Edition – $log_data\n");
        }

    }

    private function checkIndex () {

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                $this->checkIndexTranscriptions();
                break;
            case 'editions':
                $this->checkIndexEditions();
                break;
        }
        return true;
    }

    private function checkIndexTranscriptions () {

        // get versionManager
        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();

        // Get a list of triples with data about all transcribed columns, their pageIDs and their timestamps from the database

        print("Allocating transcriptions from database");
        $columnsInDatabase = [];

        $docs = $this->getDm()->getDocIdList('title');

        foreach ($docs as $doc) {
            // Get a list of transcribed pages of the document
            $pages_transcribed = $this->getDm()->getTranscribedPageListByDocId($doc);

            foreach ($pages_transcribed as $page) {

                $page_id = $this->getPageID($doc, $page);
                $page_info = $this->getDm()->getPageInfo($page_id);
                $num_cols = $page_info['num_cols'];

                for ($col = 1; $col <= $num_cols; $col++) {

                    $versions = $this->getDm()->getTranscriptionVersionsWithAuthorInfo($page_id, $col);
                    if (count($versions) === 0) {
                        // no transcription in this column
                        continue;
                    }

                    // Get timestamp
                    $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($page_id, $col);
                    $currentVersionInfo = (array)(end($versionsInfo));
                    $timeFrom = (string)$currentVersionInfo['timeFrom'];

                    $columnsInDatabase[] = [$page_id, $col, $timeFrom];
                    print(".");
                }
            }
        }

        $numColumnsInDatabase = count($columnsInDatabase);

        // Get all relevant data from the opensearch index

        print("\nAllocating transcriptions from opensearch index...");
        $indexedColumns = [];

        foreach ($this->indices as $indexName) {
            $query = $this->client->search([
                'index' => $indexName,
                'size' => 20000,
                'body' => [
                    "query" => [
                        "match_all" => [
                            "boost" => 1.0
                        ]
                    ],
                ]
            ]);

            foreach ($query['hits']['hits'] as $match) {
                $page_id = $match['_source']['pageID'];
                $col = $match['_source']['column'];
                $timeFrom = $match['_source']['time_from'];
                $indexedColumns[] = [$page_id, $col, $timeFrom];
            }
        }

        // check if every column from the database is indexed in the most up-to-date version

        print("\nComparing transcriptions in database and opensearch index...\n");

        $notIndexedColumns = [];
        $notUpdatedColumns = [];
        $numNotIndexedColumns = 0;
        $numNotUpdatedColumns = 0;
        $numNotInDatabaseColumns = 0;
        $notInDatabaseColumns = [];
        $notUpdated = false;

        foreach ($columnsInDatabase as $columnInDatabase) {

            if (!in_array($columnInDatabase, $indexedColumns)) {
                $numNotIndexedColumns++;

                foreach ($indexedColumns as $indexedColumn) {
                    if (array_slice($columnInDatabase, 0, 2) === array_slice($indexedColumn, 0, 2)) {
                        //print("Column $columnInDatabase[1] from page with id $columnInDatabase[0] is NOT UPDATED ($columnInDatabase[2] != $indexedColumn[2]).\n");
                        $numNotIndexedColumns--;
                        $numNotUpdatedColumns++;
                        $notUpdated = true;
                        $notUpdatedColumns[] = ['pageID' => $columnInDatabase[0], 'col' => $columnInDatabase[1]];
                    }
                }

                if (!$notUpdated) {
                    //print("Column $columnInDatabase[1] from page with id $columnInDatabase[0] is NOT INDEXED.\n");
                    $notIndexedColumns[] = ['pageID' => $columnInDatabase[0], 'col' => $columnInDatabase[1]];
                }
            }
        }

        foreach ($indexedColumns as $indexedColumn) {
            if (!in_array($indexedColumn, $columnsInDatabase)) {
                $numNotInDatabaseColumns++;
                $notInDatabaseColumns[] = $indexedColumn[0];
            }
        }

        if ($numNotIndexedColumns === 0 && $numNotUpdatedColumns === 0) {
            print ("INDEX IS COMPLETE!.\n");
        } else {
            print ("INDEX IS NOT COMPLETE!\n
            $numNotIndexedColumns of $numColumnsInDatabase columns are not indexed.\n
            $numNotUpdatedColumns of $numColumnsInDatabase are not up to date.\n");
        }

        if ($numNotInDatabaseColumns !== 0) {
            print("\nINFO: The index contains $numNotInDatabaseColumns columns which could not be found in the database. Their page ids are:\n");
            print(implode(", ", $notInDatabaseColumns));
        }

        $checkResults = ['notIndexed' => $notIndexedColumns, 'outdated' => $notUpdatedColumns];

        print ("Do you want to fix the index? (y, n)\n");
        $input = rtrim(fgets(STDIN));

        if ($input === 'y') {
            $this->fixIndex($checkResults);
        }

        return true;
    }

    private function checkIndexEditions () {

        // TO DO

        return true;
    }

    private function fixIndex ($data) {

        print("Fixing index...\n");

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                $this->fixIndexTranscriptions($data);
                break;
            case 'editions':
                $this->fixIndexEditions($data);
                break;
        }
    }

    private function fixIndexTranscriptions($data) {
        foreach($data['notIndexed'] as $notIndexedCol) {
            $this->addDoc($notIndexedCol['pageID'], $notIndexedCol['col']);
            sleep(2);
        }

        foreach($data['outdated'] as $outdatedCol) {
            $this->updateDoc($outdatedCol['pageID'], $outdatedCol['col']);
        }
        return true;
    }

    private function fixIndexEditions ($data) {

        // TO DO

        return true;
    }

    private function addDoc ($pageID, $col, $id=null) {

        // Get next open search id
        if ($id === null) {
            $id = $this->getNextIdForIndexing();
        }

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                $this->addColToTranscriptionsIndex($id, $pageID, $col);
                break;
            case 'editions':
                $this->addDocToEditionsIndex($id);
                break;
        }

        return true;
    }

    private function addColToTranscriptionsIndex ($id, $pageID, $col) {

        // Get doc-id for the page-id to be indexed
        $docList = $this->getDm()->getDocIdList('title');
        foreach ($docList as $doc) {
            $pages_transcribed = $this->getDm()->getTranscribedPageListByDocId($doc);
            foreach ($pages_transcribed as $page_transcribed) {
                $currentPageID = $this->getPageID($doc, $page_transcribed);
                if ($currentPageID === $pageID) {
                    $doc_id = $doc;
                    break;
                }
            }
        }

        // Get other relevent data for indexing
        $title = $this->getTitle($doc_id);
        $page = $this->getDm()->getPageInfo($pageID)['page_number'];
        $seq = $this->getSeq($doc_id, $page);
        $foliation = $this->getFoliation($doc_id, $page);
        $transcriber = $this->getTranscriber($doc_id, $page, $col);
        $transcription = $this->getTranscription($doc_id, $page, $col);
        $lang = $this->getLang($doc_id, $page);

        // Get timestamp
        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();
        $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($pageID, $col);
        $currentVersionInfo = (array)(end($versionsInfo));
        $timeFrom = (string) $currentVersionInfo['timeFrom'];

        $this->indexTranscription($this->client, $id, $title, $page, $seq, $foliation, $col, $transcriber, $pageID, $doc_id, $transcription, $lang, $timeFrom);

        return true;
    }

    private function addDocToEditionsIndex ($id) {
        // Get all relevant data from sql database

        //$this->indexEdition ($this->client, $id, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id']);
        return true;
    }

    private function updateDoc ($pageID, $col) {
        $id = $this->getOpenSearchID($pageID, $col);
        $this->removeDoc($pageID, $col);
        $this->addDoc($pageID, $col, $id);
    }

    private function removeDoc ($pageID, $col) {

        foreach ($this->indices as $indexName) {
            $this->client->delete([
                'index' => $indexName,
                'pageID' => $pageID,
                'column' => $col
            ]);

            print ("Column $col from page with ID $pageID was deleted from index *$indexName*.\n");
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
                $currentVersionInfo = (array)(end($versionsInfo));
                $timeFrom = (string)$currentVersionInfo['timeFrom'];

                $this->indexTranscription($this->client, $id, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcription, $lang, $timeFrom);

                $id = $id + 1;
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
            $latranscriptions_version = count($versions) - 1;
            return $versions[$latranscriptions_version]['author_name'];
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
            $indexName = $this->indexNamePrefix . '_' . $lang;
        }
        else {
            $indexName = $this->indexNamePrefix . '_he';
        }

        // Encode transcript for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $transcription_clean = $this->encodeForLemmatization($transcription);

        // Tokenization and lemmatization
        // Test existence of transcript and tokenize/lemmatize existing transcripts in python
        if (strlen($transcription_clean) > 3) {

            $tokens_and_lemmata = Lemmatizer::runLemmatizer($lang, $transcription_clean);

            $transcription_tokenized = $tokens_and_lemmata[0];
            $transcription_lemmatized = $tokens_and_lemmata[1];
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

    // Function to prepare the text for the lemmatizer
    public function encodeForLemmatization(string $text): string {

        $text_clean = str_replace("\n", " ", $text);
        $text_clean = str_replace(' ', ' ', $text_clean);
        $text_clean = str_replace(' ', ' ', $text_clean);
        $text_clean = str_replace('- ', '', $text_clean);

        return $text_clean;
    }

    protected function resetIndex ($client, string $index): bool {

        // Delete existing index
        if ($client->indices()->exists(['index' => $index])) {
            $client->indices()->delete([
                'index' => $index
            ]);
            $this->logger->debug("Existing index *$index* was deleted!\n");
        }

        // Create new index
        $client->indices()->create([
            'index' => $index,
            'body' => [
                'settings' => [
                    'index' => [
                        'max_result_window' => 50000
                    ]
                ]
            ]
        ]);

        $this->logger->debug("New index *$index* was created!\n");

        return true;
    }

    public function getEditionData (CollationTableManager $ctm, int $id): array
    {
        $edition_data = [];
        $data = $ctm->getCollationTableById($id);

        if ($data['type'] === 'edition') {
            $edition_data['table_id'] = $id; // equals $data['tableId']
            $edition_data['edition_witness_index'] = $data['witnessOrder'][0];

            $edition_json = $data['witnesses'][$edition_data['edition_witness_index']];
            $tokens = $edition_json['tokens'];
            $editor_id = $ctm->getCollationTableVersionManager()->getCollationTableVersionInfo($id, 1)[0]->authorTid;
            $editor = $this->getSystemManager()->getPersonManager()->getPersonEssentialData($editor_id)->name;

            $edition_text = "";

            foreach ($tokens as $token) {
                if ($token['tokenType'] !== 'empty') {
                    $edition_text = $edition_text . " " . $token['text'];
                }
            }

            $edition_data['editor'] = $editor;
            $edition_data['text'] = $edition_text;
            $edition_data['lang'] = $data['lang'];
            $edition_data['chunk_id'] = explode('-', $data['chunkId'])[1];
            $work_id = explode('-', $data['chunkId'])[0];
            $edition_data['title'] = $this->getDm()->getWorkInfoByDareId($work_id)['title'];

        }

        return $edition_data;
    }

    public function indexEdition ($client, int $id, string $editor, string $text, string $title, string $chunk, string $lang, int $table_id): bool
    {
        // Get name of the target index
        if ($lang != 'jrb') {
            $index_name = 'editions_' . $lang;
        }
        else {
            $index_name = 'editions_he';
        }

        // Encode text for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $text_clean = $this->encodeForLemmatization($text);

        // Tokenization and lemmatization
        // Test existence of text and tokenize/lemmatize existing texts in python
        if (strlen($text_clean) > 3) {
            $tokens_and_lemmata = Lemmatizer::runLemmatizer($lang, $text_clean);
//            exec("python3 ../../python/Lemmatizer_Indexing.py $lang $text_clean", $tokens_and_lemmata);

            // Get tokenized and lemmatized transcript
            $edition_tokenized = explode("#", $tokens_and_lemmata[0]);
            $edition_lemmatized = explode("#", $tokens_and_lemmata[1]);
        }
        else {
            $edition_tokenized = [];
            $edition_lemmatized = [];
            $this->logger->debug("Text is too short for lemmatization...");
        }
        if (count($edition_tokenized) !== count($edition_lemmatized)) {
            $this->logger->debug("Error! Array of tokens and lemmata do not have the same length!\n");
        }

        // Data to be stored on the OpenSearch index
        $client->create([
            'index' => $index_name,
            'id' => $id,
            'body' => [
                'table_id' => $table_id,
                'chunk' => $chunk,
                'creator' => $editor,
                'title' => $title,
                'lang' => $lang,
                'edition_tokens' => $edition_tokenized,
                'edition_lemmata' => $edition_lemmatized
            ]
        ]);

        return true;
    }

    public function cleanEditionData (array $editions): array
    {

        // Remove empty editions
        foreach ($editions as $i=>$edition) {
            if (count($edition) === 0) {
                unset ($editions[$i]);
            }
        }

        // Update keys in editions array and get number of non-empty editions
        return array_values($editions);
    }

    private function getNextIdForIndexing() {

        $ids = [];

        foreach ($this->indices as $indexName) {
            $query = $this->client->search([
                'index' => $indexName,
                'size' => 20000,
                'body' => [
                    "query" => [
                        "match_all" => [
                            "boost" => 1.0
                        ]
                    ],
                ]
            ]);

            foreach ($query['hits']['hits'] as $match) {
                $id = $match['_id'];
                $ids[] = $id;
            }
        }
        return max($ids)+1;
    }

    private function getOpenSearchID ($pageID, $col) {

        $mustConditions = [];
        $mustConditions[] = [ 'match' => ['pageID' => $pageID]];
        $mustConditions[] = [ 'match' => ['column' => $col]];

        foreach ($this->indices as $index) {
            $query = $this->client->search([
                'index' => $index,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        'bool' => [
                            'must' => $mustConditions
                        ]
                    ]
                ]
            ]);

            if ($query['hits']['hits'] !== []) {
                return $query['hits']['hits'][0]['_id'];
                }
            }
        }
}

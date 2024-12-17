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
use APM\System\ApmConfigParameter;
use APM\System\Lemmatizer;
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item;
use Exception;
use OpenSearch\ClientBuilder;

/**
 * Description of IndexManager
 *
 * Commandline utility to manage the open search indices for transcriptions and editions. 
 * Use option '-h' in the command line for getting information about how to use the manager.
 *
 * @author Lukas Reichert
 */

class IndexManager extends CommandLineUtility {

    public function main($argc, $argv): bool
    {
        // Instantiate OpenSearch client
        $this->client =  (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // print help
        if ($argv[1] === '-h') {
            $this->printHelp();
            return true;
        }

        // get target index and operation
        $this->indexNamePrefix = $argv[1];
        $operation = $argv[2];

        // get names of the indices in OpenSearch
        $this->indices = [$this->indexNamePrefix . '_la', $this->indexNamePrefix . '_ar', $this->indexNamePrefix . '_he'];

        switch ($operation) {
            case 'build': // create new or replace existing index with a specific name
                $this->buildIndex();
                break;
            case 'show':
                print("Querying…\n");
                $item = $this->getIndexedItem($argv[3], $argv[4], 'show');
                print_r($item);
                break;
            case 'showdb':
                print("Querying…");
                $item = $this->getItemFromDatabase($argv[3], $argv[4]);
                if ($item !== null) {
                    print("\n");
                    print_r($item);
                }
                break;
            case 'check': // check if the chosen index mirrors all data from the sql database or if a specific item is indexed
                $this->checkIndex($argv[3], $argv[4]);
                break;
            case 'fix':
                $this->checkAndfixIndex();
                break;
            case 'add': // adds a new single doc to an index
                $this->addItem($argv[3], $argv[4]);
                break;
            case 'update': // updates an existing doc in an index
                $this->updateItem($argv[3], $argv[4]);
                break;
            case 'remove': // removes a doc from an index
                $this->removeItem($argv[3], $argv[4]);
                break;
            default:
                print("Command not found. You will find some help via 'indexmanager -h'\n.");
        }

        return true;
    }

    private function printHelp() {
        print("Usage: indexmanager [transcriptions/editions] [operation] [pageID/tableID] [column]\nAvailable operations are:\nbuild - builds the index, deletes already existing one\nadd [arg1] ([arg2]) - adds a single item to an index\nremove [arg1] ([arg2]) - removes a single item from an index\nupdate [arg1] ([arg2]) - updates an already indexed item\nshow [arg1] ([arg2]) - shows an indexed item\nshowdb [arg1] ([arg2]) - shows an item from the database\ncheck ([arg1] ([arg2])) - checks the completeness of an index in total or the correctness of a single item in it\nfix - fixes an index by indexing not indexed items and updating outdated items\n");
        return true;
    }

    private function buildIndex () {

        print ("Building index...\n");

        // delete existing and create new index
        foreach ($this->indices as $indexName) {
            $this->resetIndex($this->client, $indexName);
        }

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                $this->buildIndexTranscriptions();
                break;
            case 'editions':
                $this->buildIndexEditions();
                break;
        }
    }

    private function buildIndexTranscriptions() {
        // get a list of all docIDs in the sql-database
        $doc_list = $this->getDm()->getDocIdList('title');

        // get all relevant data for every transcription and index it
        foreach ($doc_list as $doc_id) {
            $this->getAndIndexTranscriptionData($doc_id);
        }

        return true;
    }

    private function buildIndexEditions() {
        // gget collationTableManager
        $this->collationTableManager = $this->getSystemManager()->getCollationTableManager();

        // get the data of up to 20 000 editions
        $editions = [];
        foreach (range(1, 20000) as $id) {
            try {
                $editions[] = $this->getEditionData($this->collationTableManager, $id);
            } catch (Exception) {
                $num_editions = $id-1;
                $this->logger->debug("Found $num_editions potential editions.");
                break;
            }
        }

        // clean data
        $editions = $this->cleanEditionData($editions);
        $num_editions = count($editions);
        $this->logger->debug("Found $num_editions actual editions.");

        // index editions
        foreach ($editions as $edition) {
            $this->indexEdition ($this->client, null, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id'], $edition['timeFrom']);
            $log_data = 'Title: ' . $edition['title'] . ', Editor: ' . $edition['editor'] . ', Table ID: ' . $edition['table_id'] . ', Chunk: ' . $edition['chunk_id'] . ", TimeFrom: " . $edition['timeFrom'];
            $this->logger->debug("Indexed Edition – $log_data\n");
        }

        return true;
    }

    private function checkIndex ($arg1, $arg2, $fix=false) {

        print ("Checking...");

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                if ($arg1 === null) {
                    $this->checkIndexTranscriptions($fix);
                } else {
                    $this->checkSingleTranscription($arg1, $arg2);
                }
                break;
            case 'editions':
                if ($arg1 === null) {
                    $this->checkIndexEditions($fix);
                } else {
                    $this->checkSingleEdition($arg1);
                }
                break;
        }
        return true;
    }
    
    private function checkIndexTranscriptions ($fix) {

        // get versionManager
        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();

        // get a list of triples with data about all transcribed columns, their pageIDs and their timestamps from the database
        $columnsInDatabase = [];

        $docs = $this->getDm()->getDocIdList('title');

        foreach ($docs as $doc) {
            // get a list of transcribed pages of the document
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

                    // get timestamp
                    $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($page_id, $col);
                    $currentVersionInfo = (array)(end($versionsInfo));
                    $timeFrom = (string)$currentVersionInfo['timeFrom'];

                    $columnsInDatabase[] = [$page_id, $col, $timeFrom];
                    print(".");
                }
            }
        }

        // get all relevant data from the opensearch index
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
        $checkResults = $this->compareDataFromDatabaseAndIndex($columnsInDatabase, $indexedColumns);

        $this->evaluateCheckResults($checkResults, $fix);

        return true;
    }

    private function checkIndexEditions ($fix) {

        // get collationTableManager
        $this->collationTableManager = $this->getSystemManager()->getCollationTableManager();

        // get the data of up to 20 000 editions
        $editionsinDatabase = [];
        foreach (range(1, 20000) as $id) {
            try {
                $editionsinDatabase[] = $this->getEditionData($this->collationTableManager, $id);
                print(".");
            } catch (Exception) {
                break;
            }
        }

        // clean data
        $editionsInDatabase = $this->cleanEditionData($editionsinDatabase);

        foreach ($editionsInDatabase as $i => $edition) {
            $edition = [$edition['table_id'], $edition['chunk_id'], $edition['timeFrom']];
            $editionsInDatabase[$i] = $edition;
        }

        // get all relevant data from the opensearch index
        $indexedEditions = [];

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
                $tableID = $match['_source']['table_id'];
                $chunk = $match['_source']['chunk'];
                $timeFrom = $match['_source']['timeFrom'];
                $indexedEditions[] = [$tableID, $chunk, $timeFrom];
            }
        }


        // check if every edition from the database is indexed in the most up-to-date version
        $checkResults = $this->compareDataFromDatabaseAndIndex($editionsInDatabase, $indexedEditions);

        $this->evaluateCheckResults($checkResults, $fix);

        return true;
    }


    private function checkSingleTranscription ($pageID, $col) {

        $transcriptionInDatabase = $this->getTranscriptionFromDatabase($pageID, $col);

        if ($transcriptionInDatabase === null) {
            return true;
        }

        $transcriptionInIndex = $this->getIndexedItem($pageID, $col);

        if ($transcriptionInIndex === null) {
            print("\nTranscription is NOT INDEXED!\n");
            print ("Do you want to index it? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->addItem($pageID, $col);
            }
        } else if ($transcriptionInIndex[0]['_source']['time_from'] === $transcriptionInDatabase['timeFrom']) {
            print("\nTranscription in index is up to date!\n");
        } else {
            print("\nTranscription in index is OUTDATED!\n");
            print ("Do you want to update it? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->updateItem($pageID, $col);
            }
        }

        return true;
    }

    private function checkSingleEdition ($tableID) {

        $editionInDatabase = $this->getEditionFromDatabase($tableID);

        if ($editionInDatabase === null) {
            return true;
        }

        $editionInIndex = $this->getIndexedItem($tableID);

        if ($editionInIndex === null) {
            print("\nEdition is NOT INDEXED!\n");
            print ("Do you want to index it? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->addItem($tableID);
            }
        } else if ($editionInIndex[0]['_source']['timeFrom'] === $editionInDatabase['timeFrom']) {
            print("\nIndexed edition is up to date!\n");
        } else {
            print("\nIndexed edition is OUTDATED!\n");
            print ("Do you want to update it? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->updateItem($tableID);
            }
        }

        return true;
    }

    private function compareDataFromDatabaseAndIndex($dbData, $indexData) {

        $notIndexedItems = [];
        $notUpdatedItems = [];
        $notInDatabaseItems = [];
        $numNotIndexedItems = 0;
        $numNotUpdatedItems = 0;
        $numNotInDatabaseItems = 0;
        $notUpdated = false;
        $numItemsInDatabase = count($dbData);


        foreach ($dbData as $dbItem) {

            if (!in_array($dbItem, $indexData)) {
                $numNotIndexedItems++;

                foreach ($indexData as $indexedItem) {
                    if (array_slice($dbItem, 0, 2) === array_slice($indexedItem, 0, 2)) {
                        $numNotIndexedItems--;
                        $numNotUpdatedItems++;
                        $notUpdated = true;
                        $notUpdatedItems[] = [$dbItem[0], $dbItem[1]];
                    }
                }

                if (!$notUpdated) {
                    $notIndexedItems[] = [$dbItem[0], $dbItem[1]];
                }
            }
        }

        foreach ($indexData as $indexedItem) {
            if (!in_array($indexedItem, $dbData)  and !in_array(array_slice($indexedItem, 0, 2), $notUpdatedItems)) {
                $numNotInDatabaseItems++;
                $notInDatabaseItems[] = $indexedItem[0];
            }
        }

        if ($numNotIndexedItems === 0 && $numNotUpdatedItems === 0) {
            print ("\nINDEX IS COMPLETE!.\n");
        } else {
            print ("\nINDEX IS NOT COMPLETE!\n
            $numNotIndexedItems of $numItemsInDatabase items not indexed.\n
            $numNotUpdatedItems of $numItemsInDatabase items not up to date.\n");
        }

        if ($numNotInDatabaseItems !== 0) {
            print("\nINFO: The index contains $numNotInDatabaseItems items which could not be found in the database. Their ids are:\n");
            print(implode(", ", $notInDatabaseItems) . "\n");
        }

        $checkResults = ['notIndexed' => $notIndexedItems, 'outdated' => $notUpdatedItems, 'numNotIndexedItems' => $numNotIndexedItems, 'numNotUpdatedItems' => $numNotUpdatedItems];

        return $checkResults;
    }

    private function evaluateCheckResults ($checkResults, $fix) {
        // fix index if possible and desired
        if (!$fix and ($checkResults['numNotIndexedItems'] !== 0 or $checkResults['numNotUpdatedItems'] !== 0)) {
            print ("Do you want to fix the index? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->fixIndex($checkResults);
            }
        } else if ($fix and $checkResults['numNotIndexedItems'] === 0 and $checkResults['numNotUpdatedItems'] === 0) {
            print ("Index cannot and needs not to be fixed.\n");
        } else if ($fix) {
            $this->fixIndex($checkResults);
        }

        return true;
    }

    private function fixIndex ($data) {

        print("Fixing index...\n");

        foreach($data['notIndexed'] as $notIndexedItem) {
            $this->addItem($notIndexedItem[0], $notIndexedItem[1], null, 'fix');
        }

        foreach($data['outdated'] as $outdatedItem) {
            $this->updateItem($outdatedItem[0], $outdatedItem[1]);
        }
        return true;
    }

    private function checkAndFixIndex () {
        $this->checkIndex(null, null, true);
    }

    private function addItem ($arg1, $arg2=null, $id=null, $context=null) {

        if ($this->isAlreadyIndexed($arg1, $arg2) and $context !== 'update') {
            print ("Item is already indexed in the corresponding index. Do you want to update it? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->updateItem($arg1, $arg2);
            }

            return true;
        }

        if ($context === null) {
            print ("Indexing...\n");
        }

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                $this->addItemToTranscriptionsIndex($arg1, $arg2, $id);
                break;
            case 'editions':
                $this->addItemToEditionsIndex($arg1, $id);
                break;
        }

        return true;
    }

    private function addItemToTranscriptionsIndex ($pageID, $col, $id) {

        $doc_id = $this->getDocIdByPageId($pageID);

        if ($doc_id === null) {
            print("No transcription in database with page id $pageID and column number $col.\n");
            return null;
        }

        // Get other relevant data for indexing
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

        if ($timeFrom === '') {
            print("No transcription in database with page id $pageID and column number $col.\n");
            return null;
        };

        $this->indexTranscription($this->client, $id, $title, $page, $seq, $foliation, $col, $transcriber, $pageID, $doc_id, $transcription, $lang, $timeFrom);

        return true;
    }

    private function addItemToEditionsIndex ($tableID, $id=null) {

        // get collationTableManager
        $this->collationTableManager = $this->getSystemManager()->getCollationTableManager();

        // get the data of up to 20 000 editions
        $editions = [];
        foreach (range(1, 20000) as $i) {
            try {
                $editions[] = $this->getEditionData($this->collationTableManager, $i);
            } catch (Exception) {
                break;
            }
        }

        // Clean data
        $editions = $this->cleanEditionData($editions);

        // Index editions
        $editionExists = false;
        foreach ($editions as $edition) {

            if ($edition['table_id'] === (int) $tableID) {
                $this->indexEdition($this->client, $id, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id'], $edition['timeFrom']);
                $log_data = 'Title: ' . $edition['title'] . ', Editor: ' . $edition['editor'] . ', Table ID: ' . $edition['table_id'] . ', Chunk: ' . $edition['chunk_id'] . ", TimeFrom: " . $edition['timeFrom'];
                $this->logger->debug("Indexed Edition – $log_data\n");
                $editionExists = true;
            }
        }

        if (!$editionExists) {
            print ("No edition in database with table id $tableID.\n");
        }

        return true;
    }

    private function updateItem ($arg1, $arg2=null) {

        if (!$this->isAlreadyIndexed($arg1, $arg2)) {
            print ("Item is not yet indexed and therefore cannot be updated.\nDo you want to index it? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->addItem($arg1, $arg2);
            }
            return true;
        }

        print ("Updating...\n");

        $id = $this->getOpenSearchIDAndIndexName($arg1, $arg2)['id'];
        $this->removeItem($arg1, $arg2, 'update');
        $this->addItem($arg1, $arg2, $id, 'update');

        return true;
    }

    private function removeItem ($arg1, $arg2=null, $context='remove') {

        if ($context !== 'update') {
            print ("Removing...\n");
        }

        $data = $this->getOpenSearchIDAndIndexName($arg1, $arg2);
        $index = $data['index'];
        $id = $data['id'];

        if ($id !== null) {
            $this->client->delete([
                'index' => $index,
                'id' => $id
            ]);

            if ($context !== 'update') {
                switch ($this->indexNamePrefix) {
                    case 'transcriptions':
                        print ("Column $arg2 from page with ID $arg1 has been removed from index *$index*.\n");
                        break;
                    case 'editions':
                        print ("Table with ID $arg1 has been removed from index *$index*.\n");
                        break;
                }
            }
        } else {
            switch ($this->indexNamePrefix) {
                case 'transcriptions':
                    print ("Column $arg2 from page with ID $arg1 does not exist and therefore cannot be removed.\n");
                    break;
                case 'editions':
                    print ("Table with ID $arg1 does not exist and therefore cannot be removed.\n");
                    break;
            }
        }
        return true;
    }


    private function getItemFromDatabase ($arg1, $arg2) {

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                return $this->getTranscriptionFromDatabase($arg1, $arg2);
            case 'editions':
                return $this->getEditionFromDatabase($arg1);
        }

        return true;
    }

    private function getTranscriptionFromDatabase ($pageID, $col) {

        $doc_id = $this->getDocIdByPageId($pageID);

        if ($doc_id === null) {
            print("\nNo transcription in database with page id $pageID and column number $col.\n");
            return null;
        }

        // Get other relevant data for indexing
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

        if ($timeFrom === '') {
            print("\nNo transcription in database with page id $pageID and column number $col.\n");
            return null;
        };

        $data = ['title' => $title,
                 'page' => $page,
                 'seq' => $seq,
                 'foliation' => $foliation,
                 'transcriber' => $transcriber,
                 'transcription' => $transcription,
                 'lang' => $lang,
                 'timeFrom' => $timeFrom] ;

        return $data;
    }

    private function getEditionFromDatabase ($tableID)  {

        // get collationTableManager
        $this->collationTableManager = $this->getSystemManager()->getCollationTableManager();

        // get the data of up to 20 000 editions
        $editions = [];
        foreach (range(1, 20000) as $i) {
            try {
                $editions[] = $this->getEditionData($this->collationTableManager, $i);
            } catch (Exception) {
                break;
            }
        }

        // clean data
        $editions = $this->cleanEditionData($editions);

        // index editions
        $editionExists = false;

        foreach ($editions as $edition) {

            if ($edition['table_id'] === (int) $tableID) {
                $data = ['title' => $edition['title'],
                    'editor' => $edition['editor'],
                    'table_id' => $edition['table_id'],
                    'chunk' => $edition['chunk_id'],
                    'text' => $edition['text'],
                    "timeFrom" => $edition['timeFrom']];

                $editionExists = true;
            }
        }

        if (!$editionExists) {
            print ("\nNo edition in database with table id $tableID.\n");
            return null;
        }

        return $data;
    }
    
    private function getIndexedItem ($arg1, $arg2=null, $context=null) {

        $mustConditions = [];

        if ($this->indexNamePrefix === 'transcriptions') {
            $mustConditions[] = [ 'match' => ['pageID' => $arg1]];
            $mustConditions[] = [ 'match' => ['column' => $arg2]];
        } else if ($this->indexNamePrefix === 'editions') {
            $mustConditions[] = [ 'match' => ['table_id' => $arg1]];
        }

        foreach ($this->indices as $indexName) {
            $data = $this->client->search([
                'index' => $indexName,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        'bool' => [
                            'must' => $mustConditions
                        ]
                    ]
                ]
            ]);


            if ($data['hits']['total']['value'] !== 0) {
                return ($data['hits']['hits']);
            }
        }

        if ($context === 'show') {
            print("Item not indexed!\nDo you want to index it? (y/n)\n");

            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->addItem($arg1, $arg2);
            }
        }

        return true;
    }

    private function isAlreadyIndexed ($arg1, $arg2=null) {

        if ($this->getOpenSearchIDAndIndexName($arg1, $arg2)['id'] === null) {
            return false;
        } else {
            return true;
        }
    }

    private function getOpenSearchIDAndIndexName ($arg1, $arg2=null) {

        $mustConditions = [];

        if ($this->indexNamePrefix === 'transcriptions') {
            $mustConditions[] = [ 'match' => ['pageID' => $arg1]];
            $mustConditions[] = [ 'match' => ['column' => $arg2]];
        } else if ($this->indexNamePrefix === 'editions') {
            $mustConditions[] = [ 'match' => ['table_id' => $arg1]];
        }

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
                return ['index' => $index, 'id' => $query['hits']['hits'][0]['_id']];
            }
        }

        return true;
    }

    private function getAndIndexTranscriptionData (string $doc_id): int
    {

        $title = $this->getTitle($doc_id);

        // get a list of transcribed pages of the document
        $pages_transcribed = $this->getDm()->getTranscribedPageListByDocId($doc_id);


        // iterate over transcribed pages
        foreach ($pages_transcribed as $page) {

            // get pageID, number of columns and sequence number of the page
            $page_id = $this->getPageID($doc_id, $page);
            $page_info = $this->getDm()->getPageInfo($page_id);
            $num_cols = $page_info['num_cols'];
            $seq = $this->getSeq($doc_id, $page);

            // iterate over all columns of the page and get the corresponding transcripts and transcribers
            for ($col = 1; $col <= $num_cols; $col++) {
                $versions = $this->getDm()->getTranscriptionVersionsWithAuthorInfo($page_id, $col);
                if (count($versions) === 0) {
                    // no transcription in this column
                    continue;
                }

                $transcription = $this->getTranscription($doc_id, $page, $col);
                $transcriber = $this->getTranscriber($doc_id, $page, $col);

                // get language of current column (same as document)
                $lang = $this->getLang($doc_id, $page);

                // get foliation number of the current page/sequence number
                $foliation = $this->getFoliation($doc_id, $page);

                // get timestamp
                $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();
                $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($page_id, $col);
                $currentVersionInfo = (array)(end($versionsInfo));
                $timeFrom = (string)$currentVersionInfo['timeFrom'];

                $this->indexTranscription($this->client, null, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcription, $lang, $timeFrom);

            }
        }

        return true;
    }

    // Function to add columns as items to the OpenSearch index
    public function indexTranscription ($client, $id, string $title, int $page, int $seq, string $foliation, int $col, string $transcriber, int $page_id, int $doc_id, string $transcription, string $lang, string $timeFrom): bool
    {

        if ($lang != 'jrb') {
            $indexName = $this->indexNamePrefix . '_' . $lang;
        }
        else {
            $indexName = $this->indexNamePrefix . '_he';
        }

        // encode transcript for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $transcription_clean = $this->encodeForLemmatization($transcription);

        // tokenization and lemmatization
        // test existence of transcript and tokenize/lemmatize existing transcripts in python
        if (strlen($transcription_clean) > 3) {

            $tokens_and_lemmata = Lemmatizer::runLemmatizer($lang, $transcription_clean, $this->indexNamePrefix);

            // get tokenized and lemmatized transcript
            $transcription_tokenized = $tokens_and_lemmata['tokens'];
            $transcription_lemmatized = $tokens_and_lemmata['lemmata'];
        }
        else {
            $transcription_tokenized = [];
            $transcription_lemmatized = [];
            $this->logger->debug("Transcript is too short for lemmatization...");
        }
        if (count($transcription_tokenized) !== count($transcription_lemmatized)) {
            $this->logger->debug("Error! Array of tokens and lemmata do not have the same length!\n");
        }

        // data to be stored on the OpenSearch index
        if ($id === null) {
            $client->create([
                'index' => $indexName,
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
        } else {
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
        }

        $this->logger->debug("Indexed Document in $indexName – Doc ID: $doc_id ($title) Page ID: $page_id Page: $page Seq: $seq Foliation: $foliation Column: $col Transcriber: $transcriber Lang: $lang TimeFrom: $timeFrom\n");
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
            $versionInfo = $ctm->getCollationTableVersionManager()->getCollationTableVersionInfo($id);
            $editor_id = end( $versionInfo)->authorTid;
            $timeFrom = end($versionInfo)->timeFrom;
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
            $edition_data['timeFrom'] = $timeFrom;
        }

        return $edition_data;
    }

    public function indexEdition ($client, $id, string $editor, string $text, string $title, string $chunk, string $lang, int $table_id, string $timeFrom): bool
    {
        // Get name of the target index
        if ($lang != 'jrb') {
            $index_name = $this->indexNamePrefix . '_' . $lang;
        }
        else {
            $index_name = $this->indexNamePrefix . '_he';
        }

        // encode text for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $text_clean = $this->encodeForLemmatization($text);

        // tokenization and lemmatization
        // test existence of text and tokenize/lemmatize existing texts
        if (strlen($text_clean) > 3) {
            $tokens_and_lemmata = Lemmatizer::runLemmatizer($lang, $text_clean, $this->indexNamePrefix);

            // Get tokenized and lemmatized transcript
            $edition_tokenized = $tokens_and_lemmata['tokens'];
            $edition_lemmatized = $tokens_and_lemmata['lemmata'];
        }
        else {
            $edition_tokenized = [];
            $edition_lemmatized = [];
            $this->logger->debug("Text is too short for lemmatization...");
        }
        if (count($edition_tokenized) !== count($edition_lemmatized)) {
            $this->logger->debug("Error! Array of tokens and lemmata do not have the same length!\n");
        }

        // data to be stored on the OpenSearch index
        if ($id === null) {
            $client->create([
                'index' => $index_name,
                'body' => [
                    'table_id' => $table_id,
                    'chunk' => $chunk,
                    'creator' => $editor,
                    'title' => $title,
                    'lang' => $lang,
                    'edition_tokens' => $edition_tokenized,
                    'edition_lemmata' => $edition_lemmatized,
                    'timeFrom' => $timeFrom
                ]
            ]);
        } else {
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
                    'edition_lemmata' => $edition_lemmatized,
                    'timeFrom' => $timeFrom
                ]
            ]);
        }

        return true;
    }

    public function cleanEditionData (array $editions): array
    {

        // remove empty editions
        foreach ($editions as $i=>$edition) {

            if (count($edition) === 0) {
                unset ($editions[$i]);
            }
        }

        // update keys in editions array and get number of non-empty editions
        return array_values($editions);
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

        // delete existing index
        if ($client->indices()->exists(['index' => $index])) {
            $client->indices()->delete([
                'index' => $index
            ]);
            $this->logger->debug("Existing index *$index* was deleted!\n");
        }

        // create new index
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

    private function getDocIdByPageId ($pageID) {

        $docList = $this->getDm()->getDocIdList('title');
        foreach ($docList as $doc) {
            $pages_transcribed = $this->getDm()->getTranscribedPageListByDocId($doc);
            foreach ($pages_transcribed as $page_transcribed) {
                $currentPageID = $this->getPageID($doc, $page_transcribed);
                if ((string) $currentPageID === $pageID or $currentPageID === $pageID) {
                    return $doc;
                }
            }
        }

        return true;
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
}

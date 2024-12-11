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
        // Instantiate OpenSearch client
        $this->client =  (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // help
        if ($argv[1] === '-h') {
                print("Usage: indexmanager [transcriptions/editions] [operation] [pageID/tableID] [column/chunk]\n
Available operations are:\nbuild - builds the index, deletes already existing one\nadd [arg1] [arg2] - adds a single item to an index\nremove [arg1] [arg2] - removes a single item from an index\nupdate [arg1] [arg2] - updates an already indexed item\nshow [arg1] [arg2] - shows an indexed item\nshowdb [arg1] [arg2] - shows an item from the database\ncheck ([arg1] [arg2]) - checks the completeness of an index in total or the correctness of a single item in it\nfix - fixes an index by indexing not indexed items and updating outdated items\n");
                return true;
        }

        // get desired operation and indexNamePrefix
        $operation = $argv[2];
        $this->indexNamePrefix = $argv[1];

        // Name of the indices in OpenSearch
        $this->indices = [$this->indexNamePrefix . '_la', $this->indexNamePrefix . '_ar', $this->indexNamePrefix . '_he'];

        switch ($operation) {
            case 'build': // create new or replace existing index with a specific name
                $this->buildIndex();
                break;
            case 'show':
                $identifier1 = $argv[3];
                $identifier2 = $argv[4];
                print("Querying…\n");
                $data = $this->getIndexedItem($identifier1, $identifier2);
                print_r($data);
                break;
            case 'showdb':
                $identifier1 = $argv[3];
                $identifier2 = $argv[4];
                print("Querying…");
                $data = $this->getItemFromDatabase($identifier1, $identifier2);
                if ($data !== null) {
                    print("\n");
                    print_r($data);
                }
                break;
            case 'check': // check if a specific index mirrors all data from the sql database
                $identifier1 = $argv[3];
                $identifier2 = $argv[4];
                $this->checkIndex($identifier1, $identifier2);
                break;
            case 'fix':
                $this->checkAndfixIndex();
                break;
            case 'add': // adds a new single doc to an index
                $identifier1 = $argv[3];
                $identifier2 = $argv[4];
                if (!$this->isAlreadyIndexed($identifier1, $identifier2)) {
                    $this->addItem($identifier1, $identifier2);
                } else {
                    print ("Item is already indexed in the corresponding index. Do you want to update it? (y/n)\n");
                    $input = rtrim(fgets(STDIN));

                    if ($input === 'y') {
                        $this->updateItem($identifier1, $identifier2);
                    }
                }
                break;
            case 'update': // updates an existing doc in an index
                $identifier1 = $argv[3];
                $identifier2 = $argv[4];
                if ($this->isAlreadyIndexed($identifier1, $identifier2)) {
                    $this->updateItem($identifier1, $identifier2);
                } else {
                    print ("Item is not yet indexed and therefore cannot be updated.\nDo you want to index it? (y/n)\n");
                    $input = rtrim(fgets(STDIN));

                    if ($input === 'y') {
                        $this->addItem($identifier1, $identifier2);
                    }
                }
                    break;
            case 'remove': // removes a doc from an index
                $identifier1 = $argv[3];
                $identifier2 = $argv[4];
                $this->removeItem($identifier1, $identifier2);
                break;
            default:
                print("Command not found. You will find some help via 'indexmanager -h'\n.");
        }

        return true;
    }

    private function buildIndex () {

        print ("Building index...\n");

        // Delete existing and create new index
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
        // Get a list of all docIDs in the sql-database
        $doc_list = $this->getDm()->getDocIdList('title');

        // Get all relevant data for every transcription and index it
        foreach ($doc_list as $doc_id) {
            $this->getAndIndexTranscriptionData($doc_id);
        }

        return true;
    }

    private function buildIndexEditions() {
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
        }

        // Clean data
        $editions = $this->cleanEditionData($editions);
        $num_editions = count($editions);
        $this->logger->debug("Found $num_editions actual editions.");

        // Index editions
        foreach ($editions as $edition) {
            $this->indexEdition ($this->client, null, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id'], $edition['timeFrom']);
            $log_data = 'Title: ' . $edition['title'] . ', Editor: ' . $edition['editor'] . ', Table ID: ' . $edition['table_id'] . ', Chunk: ' . $edition['chunk_id'] . ", TimeFrom: " . $edition['timeFrom'];
            $this->logger->debug("Indexed Edition – $log_data\n");
        }

        return true;
    }

    private function checkIndex ($identifier1, $identifier2, $fix=false) {

        print ("Checking...");

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                if ($identifier1 === null) {
                    $this->checkIndexTranscriptions($fix);
                } else {
                    $this->checkSingleTranscription($identifier1, $identifier2);
                }
                break;
            case 'editions':
                if ($identifier1 === null) {
                    $this->checkIndexEditions($fix);
                } else {
                    $this->checkSingleEdition($identifier1, $identifier2);
                }
                break;
        }
        return true;
    }

    
    private function checkIndexTranscriptions ($fix) {

        // get versionManager
        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();

        // Get a list of triples with data about all transcribed columns, their pageIDs and their timestamps from the database
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
                        $notUpdatedColumns[] = [$columnInDatabase[0], $columnInDatabase[1]];
                    }
                }

                if (!$notUpdated) {
                    //print("Column $columnInDatabase[1] from page with id $columnInDatabase[0] is NOT INDEXED.\n");
                    $notIndexedColumns[] = [$columnInDatabase[0], $columnInDatabase[1]];
                }
            }
        }

        foreach ($indexedColumns as $indexedColumn) {
            if (!in_array($indexedColumn, $columnsInDatabase)  and !in_array(array_slice($indexedColumn, 0, 2), $notUpdatedColumns)) {
                $numNotInDatabaseColumns++;
                $notInDatabaseColumns[] = $indexedColumn[0];
            }
        }

        if ($numNotIndexedColumns === 0 && $numNotUpdatedColumns === 0) {
            print ("\nINDEX IS COMPLETE!.\n");
        } else {
            print ("\nINDEX IS NOT COMPLETE!\n
            $numNotIndexedColumns of $numColumnsInDatabase columns not indexed.\n
            $numNotUpdatedColumns of $numColumnsInDatabase columns not up to date.\n");
        }

        if ($numNotInDatabaseColumns !== 0) {
            print("\nINFO: The index contains $numNotInDatabaseColumns columns which could not be found in the database. Their page ids are:\n");
            print(implode(", ", $notInDatabaseColumns) . "\n");
        }

        $checkResults = ['notIndexed' => $notIndexedColumns, 'outdated' => $notUpdatedColumns];

        if (!$fix and ($numNotIndexedColumns !== 0 or $numNotUpdatedColumns !== 0)) {
            print ("Do you want to fix the index? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->fixIndex($checkResults);
            }
        } else if ($fix and $numNotIndexedColumns === 0 and $numNotUpdatedColumns === 0) {
            print ("Index cannot and needs not to be fixed.\n");
        } else if ($fix) {
            $this->fixIndex($checkResults);
        }

        return true;
    }

    private function checkIndexEditions ($fix) {

        // Get collationTableManager
        $this->collationTableManager = $this->getSystemManager()->getCollationTableManager();

        // Get the data of up to 20 000 editions
        $editionsinDatabase = [];
        foreach (range(1, 20000) as $id) {
            try {
                $editionsinDatabase[] = $this->getEditionData($this->collationTableManager, $id);
                print(".");
            } catch (Exception) {
                break;
            }
        }

        // Clean data
        $editionsInDatabase = $this->cleanEditionData($editionsinDatabase);
        $numEditionsInDatabase = count($editionsInDatabase);

        foreach ($editionsInDatabase as $i => $edition) {
            $edition = [$edition['table_id'], $edition['chunk_id'], $edition['timeFrom']];
            $editionsInDatabase[$i] = $edition;
        }

        // Get all relevant data from the opensearch index
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


        // check if every column from the database is indexed in the most up-to-date version
        $notIndexedEditions = [];
        $notUpdatedEditions = [];
        $numNotIndexedEditions = 0;
        $numNotUpdatedEditions = 0;
        $numNotInDatabaseEditions = 0;
        $notInDatabaseEditions = [];
        $notUpdated = false;

        foreach ($editionsInDatabase as $editionInDatabase) {

            if (!in_array($editionInDatabase, $indexedEditions)) {
                $numNotIndexedEditions++;

                foreach ($indexedEditions as $indexedEdition) {
                    if (array_slice($editionInDatabase, 0, 2) === array_slice($indexedEdition, 0, 2)) {
                        // edition is indexed but outdated
                        $numNotIndexedEditions--;
                        $numNotUpdatedEditions++;
                        $notUpdated = true;
                        $notUpdatedEditions[] = [$editionInDatabase[0], $editionInDatabase[1]];
                    }
                }

                if (!$notUpdated) { // edition is not indexed
                    $notIndexedEditions[] = [$editionInDatabase[0], $editionInDatabase[1]];
                }
            }
        }

        foreach ($indexedEditions as $indexedEdition) {
            if (!in_array($indexedEdition, $editionsInDatabase) and !in_array(array_slice($indexedEdition, 0, 2), $notUpdatedEditions)) {
                print_r(array_values($notUpdatedEditions));
                print_r(array_slice($indexedEdition, 0, 2));
                $numNotInDatabaseEditions++;
                $notInDatabaseEditions[] = $indexedEdition[0];
            }
        }

        if ($numNotIndexedEditions === 0 && $numNotUpdatedEditions === 0) {
            print ("\nINDEX IS COMPLETE!.\n");
        } else {
            print ("\nINDEX IS NOT COMPLETE!\n
            $numNotIndexedEditions of $numEditionsInDatabase editions not indexed.\n
            $numNotUpdatedEditions of $numEditionsInDatabase editions not up to date.\n");
        }

        if ($numNotInDatabaseEditions !== 0) {
            print("\nINFO: The index contains $numNotInDatabaseEditions editions which could not be found in the database. Their table ids are:\n");
            print(implode(", ", $notInDatabaseEditions) . "\n");
        }

        $checkResults = ['notIndexed' => $notIndexedEditions, 'outdated' => $notUpdatedEditions];

        if (!$fix and ($numNotIndexedEditions !== 0 or $numNotUpdatedEditions !== 0)) {
            print ("Do you want to fix the index? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->fixIndex($checkResults);
            }
        } else if ($fix and $numNotIndexedEditions === 0 and $numNotUpdatedEditions === 0) {
            print ("Index cannot and needs not to be fixed.\n");
        } else if ($fix) {
            $this->fixIndex($checkResults);
        }

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

    private function checkSingleEdition ($tableID, $chunk) {

        $editionInDatabase = $this->getEditionFromDatabase($tableID, $chunk);

        if ($editionInDatabase === null) {
            return true;
        }

        $editionInIndex = $this->getIndexedItem($tableID, $chunk);

        if ($editionInIndex === null) {
            print("\nEdition is NOT INDEXED!\n");
            print ("Do you want to index it? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->addItem($tableID, $chunk);
            }
        } else if ($editionInIndex[0]['_source']['timeFrom'] === $editionInDatabase['timeFrom']) {
            print("\nIndexed edition is up to date!\n");
        } else {
            print("\nIndexed edition is OUTDATED!\n");
            print ("Do you want to update it? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->updateItem($tableID, $chunk);
            }
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

    private function addItem ($identifier1, $identifier2, $id=null, $context=null) {

        if ($context === null) {
            print ("Indexing...\n");
        }

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                $this->addItemToTranscriptionsIndex($identifier1, $identifier2, $id);
                break;
            case 'editions':
                $this->addItemToEditionsIndex($identifier1, $identifier2, $id);
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

    private function addItemToEditionsIndex ($tableID, $chunkID, $id=null, $context=null) {
        // Get collationTableManager
        $this->collationTableManager = $this->getSystemManager()->getCollationTableManager();

        // Get the data of up to 20 000 editions
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

            if ($edition['table_id'] === (int) $tableID and $edition['chunk_id'] === $chunkID) {
                $this->indexEdition($this->client, $id, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id'], $edition['timeFrom']);
                $log_data = 'Title: ' . $edition['title'] . ', Editor: ' . $edition['editor'] . ', Table ID: ' . $edition['table_id'] . ', Chunk: ' . $edition['chunk_id'] . ", TimeFrom: " . $edition['timeFrom'];
                $this->logger->debug("Indexed Edition – $log_data\n");
                $editionExists = true;
            }
        }

        if (!$editionExists) {
            print ("No edition in database with table id $tableID and chunk id $chunkID.\n");
        }

        return true;
    }

    private function updateItem ($identifier1, $identifier2) {

        print ("Updating...\n");

        $id = $this->getOpenSearchIDAndIndexName($identifier1, $identifier2)['id'];
        $this->removeItem($identifier1, $identifier2, 'update');
        $this->addItem($identifier1, $identifier2, $id, 'update');
    }

    private function removeItem ($identifier1, $identifier2, $context='remove') {

        if ($context !== 'update') {
            print ("Removing...\n");
        }

        $data = $this->getOpenSearchIDAndIndexName($identifier1, $identifier2);
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
                        print ("Column $identifier2 from page with ID $identifier1 has been removed from index *$index*.\n");
                        break;
                    case 'editions':
                        print ("Chunk $identifier2 from table with ID $identifier1 has been removed from index *$index*.\n");
                        break;
                }
            }
        } else {
            switch ($this->indexNamePrefix) {
                case 'transcriptions':
                    print ("Column $identifier2 from page with ID $identifier1 does not exist and therefore cannot be removed.\n");
                    break;
                case 'editions':
                    print ("Chunk $identifier2 from table with ID $identifier1 does not exist and therefore cannot be removed.\n");
                    break;
            }
        }
        return true;
    }


    private function getItemFromDatabase ($identifier1, $identifier2) {

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                return $this->getTranscriptionFromDatabase($identifier1, $identifier2);
            case 'editions':
                return $this->getEditionFromDatabase($identifier1, $identifier2);
        }
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

    private function getEditionFromDatabase ($tableID, $chunk)  {

        // Get collationTableManager
        $this->collationTableManager = $this->getSystemManager()->getCollationTableManager();

        // Get the data of up to 20 000 editions
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

            if ($edition['table_id'] === (int) $tableID and $edition['chunk_id'] === $chunk) {
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
            print ("\nNo edition in database with table id $tableID and chunk id $chunk.\n");
            return null;
        }

        return $data;
    }
    
    private function getIndexedItem ($identifier1, $identifier2) {

        $mustConditions = [];

        if ($this->indexNamePrefix === 'transcriptions') {
            $mustConditions[] = [ 'match' => ['pageID' => $identifier1]];
            $mustConditions[] = [ 'match' => ['column' => $identifier2]];
        } else if ($this->indexNamePrefix === 'editions') {
            $mustConditions[] = [ 'match' => ['table_id' => $identifier1]];
            $mustConditions[] = [ 'match' => ['chunk' => $identifier2]];
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

        print("Item not indexed!\nDo you want to index it? (y/n)\n");

        $input = rtrim(fgets(STDIN));

        if ($input === 'y') {
            $this->addItem($identifier1, $identifier2);
            return null;
        } else {
            return null;
        }
    }

    private function isAlreadyIndexed ($pageID, $col) {

        if ($this->getOpenSearchIDAndIndexName($pageID, $col)['id'] === null) {
            return false;
        } else {
            return true;
        }
    }

    private function getOpenSearchIDAndIndexName ($identifier1, $identifier2) {

        $mustConditions = [];

        if ($this->indexNamePrefix === 'transcriptions') {
            $mustConditions[] = [ 'match' => ['pageID' => $identifier1]];
            $mustConditions[] = [ 'match' => ['column' => $identifier2]];

        } else {
            $mustConditions[] = [ 'match' => ['table_id' => $identifier1]];
            $mustConditions[] = [ 'match' => ['chunk' => $identifier2]];
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
    }

    private function getAndIndexTranscriptionData (string $doc_id): int
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

                $this->indexTranscription($this->client, null, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcription, $lang, $timeFrom);

            }
        }

        return true;
    }

    // Function to add pages to the OpenSearch index
    public function indexTranscription ($client, $id, string $title, int $page, int $seq, string $foliation, int $col, string $transcriber, int $page_id, int $doc_id, string $transcription, string $lang, string $timeFrom): bool
    {

        if ($lang != 'jrb') {
            $indexName = $this->indexNamePrefix . '_' . $lang;
        }
        else {
            $indexName = $this->indexNamePrefix . '_he';
        }

        //print("encoding for lemmatization\n");

        // Encode transcript for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $transcription_clean = $this->encodeForLemmatization($transcription);

        //print("lemmatizing\n");
        // Tokenization and lemmatization
        // Test existence of transcript and tokenize/lemmatize existing transcripts in python
        if (strlen($transcription_clean) > 3) {

            $tokens_and_lemmata = Lemmatizer::runLemmatizer($lang, $transcription_clean, $this->indexNamePrefix);

            // Get tokenized and lemmatized transcript
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

        //print("creating entry in os\n");
        // Data to be stored on the OpenSearch index
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

    public function indexEdition ($client, $id=null, string $editor, string $text, string $title, string $chunk, string $lang, int $table_id, string $timeFrom): bool
    {
        // Get name of the target index
        if ($lang != 'jrb') {
            $index_name = $this->indexNamePrefix . '_' . $lang;
        }
        else {
            $index_name = $this->indexNamePrefix . '_he';
        }


        // Encode text for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $text_clean = $this->encodeForLemmatization($text);

        // Tokenization and lemmatization
        // Test existence of text and tokenize/lemmatize existing texts
        if (strlen($text_clean) > 3) {
            $tokens_and_lemmata = Lemmatizer::runLemmatizer($lang, $text_clean, $this->indexNamePrefix);
//            exec("python3 ../../python/Lemmatizer_Indexing.py $lang $text_clean", $tokens_and_lemmata);

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

        // Data to be stored on the OpenSearch index
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

        // Remove empty editions
        foreach ($editions as $i=>$edition) {

            if (count($edition) === 0) {
                unset ($editions[$i]);
            }
        }

        // Update keys in editions array and get number of non-empty editions
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

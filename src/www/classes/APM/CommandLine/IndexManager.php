<?php

/*
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General private License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General private License for more details.
 *
 *  You should have received a copy of the GNU General private License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

namespace APM\CommandLine;

use APM\CollationTable\CollationTableManager;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\System\ApmConfigParameter;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Lemmatizer;
use APM\System\Person\PersonNotFoundException;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\TxText\Item;
use APM\System\Work\WorkNotFoundException;
use APM\ToolBox\DateTimeFormat;
use Exception;
use ThomasInstitut\DataTable\InvalidTimeStringException;
use Typesense\Client;
use Typesense\Exceptions\ConfigError;
use Typesense\Exceptions\TypesenseClientError;


/**
 * Description of IndexManager
 *
 * Commandline utility to manage the open search indices for transcriptions and editions.
 * Use option '-h' in the command line for getting information about how to use the index manager.
 *
 * @author Lukas Reichert
 */
class IndexManager extends CommandLineUtility
{
    private ?Client $client = null;
    private string $indexNamePrefix;
    /**
     * @var string[]
     */
    private array $indices;


    /**
     * This main function is called from the command line. Depending on the arguments given to the index manager command line tool,
     * a specific operation on a specific index will be executed.
     * @param $argc
     * @param $argv
     * @return bool
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     * @throws TypesenseClientError
     * @throws \Http\Client\Exception
     */
    public function main($argc, $argv): bool
    {
        // Instantiate Typesense client
        $config = $this->getSystemManager()->getConfig();
        $this->instantiateTypesenseClient($config);


        if ($this->client === false) {
            return false;
        }
        if (count($argv) < 2) {
            $this->printHelp();
            return true;
        }
        // print help
        if ($argv[1] === '-h') {
            $this->printHelp();
            return true;
        } else if ($argv[1] === 'transcriptions' || $argv[1] === 't') {
            // get target index and operation
            $this->indexNamePrefix = 'transcriptions';
        } else if ($argv[1] === 'editions' || $argv[1] === 'e') {
            // get target index and operation
            $this->indexNamePrefix = 'editions';
        } else {
            print ("Command not found. Please check the help via -h.\n");
            return false;
        }

        // get t operation
        $operation = $argv[2];

        // get names of the indices in typesense
        $this->indices = [$this->indexNamePrefix . '_la', $this->indexNamePrefix . '_ar', $this->indexNamePrefix . '_he'];

        // handle empty arguments
        if (!isset($argv[3])) {$argv[3] = null;}
        if (!isset($argv[4])) {$argv[4] = "";}

        switch ($operation) {
            case 'build': // create new or replace existing index with a specific name
                $this->buildIndex();
                break;

            case 'show':
                print("Querying…\n");
                $item = $this->getIndexedItemInfo($argv[3], $argv[4], 'show');
                if ($item !== []) {
                    print_r($item);
                }
                break;

            case 'showdb':
                print("Querying…");
                $item = $this->getItemInfoFromDatabase($argv[3], $argv[4]);

                if ($item !== []) {
                    print("\n");
                    print_r($item);
                }
                break;

            case 'check':
                // check if the chosen index mirrors all data from the sql database or if a specific item is indexed
                $this->checkIndex($argv[3], $argv[4]);
                break;

            case 'fix':
                $this->checkAndfixIndex($argv[3], $argv[4]);
                break;

            case 'add':
                // adds a new single item to an index
                $this->addItem($argv[3], $argv[4]);
                break;

            case 'update':
                // updates an existing item in an index
                $this->updateItem($argv[3], $argv[4]);
                break;

            case 'update-add':
                // updates an item if already indexed, otherwise adds the item to the index
                $this->updateOrAddItem($argv[3], $argv[4]);
                break;

            case 'remove':
                // removes an item from an index
                $this->removeItem($argv[3], $argv[4]);
                break;

            default:
                print("Command not found. You will find some help via 'indexmanager -h'\n.");
        }

        return true;
    }

    /**
     * Prints information about how to use the index manager command line tool. Use option -h in the command line to get the information.
     * @return void
     */
    private function printHelp(): void
    {
        $help = <<<END
Usage: indexmanager [transcriptions/editions] [operation] [pageID/tableID] [column]

Available operations are:
  build - builds the index, deletes already existing one
  add [arg1] ([arg2]) - adds a single item to an index
  remove [arg1] ([arg2]) - removes a single item from an index
  update [arg1] ([arg2]) - updates an already indexed item
  show [arg1] ([arg2]) - shows an indexed item
  showdb [arg1] ([arg2]) - shows an item from the database
  check ([arg1] ([arg2])) - checks the completeness of an index in total or the correctness of a single item in it
  fix ([arg1] ([arg2])) - fixes a single item or an index in total by indexing not indexed items and updating outdated items

END;

        print($help);
    }

    /**
     * Builds the transcriptions or editions index in open search after getting all relevant data from the sql database. Deletes already existing transcriptions or editions index.
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function buildIndex(): void
    {

        print ("Building index $this->indexNamePrefix\n");

        // delete existing and create a new index
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

        print("Check and fix the index...\n ");

        $this->checkAndFixIndex();

        print("BUILDING COMPLETE!\n ");

    }

    /**
     * Builds the transcription index in Typesense after getting all relevant data from the MySQL database.
     * @return void
     */
    private function buildIndexTranscriptions(): void
    {

        // get a list of all docIDs in the sql-database
        $docIds = $this->getSystemManager()->getEntitySystem()->getAllEntitiesForType(Entity::tDocument);

        $transcribedPageCount = $this->getSystemManager()->getTranscriptionManager()->getTranscribedPageCount();

        printf("There are %d documents in the system with %d transcribed pages in total\n", count($docIds), $transcribedPageCount);
        $absStart = microtime(true);
        $pagesIndexed = 0;
        foreach ($docIds as $docId) {
            // get the list of transcribed pages
            try {
                $title = $this->getTitle($docId);
                $pages_transcribed = $this->getSystemManager()->getTranscriptionManager()->getTranscribedPageListByDocId($docId);
            } catch (DocumentNotFoundException) {
                print "\nERROR: document $docId not found\n";
                return;
            }

            $pageCount = count($pages_transcribed);

            if ($pageCount === 0) {
                continue;
            }
            // iterate over transcribed pages
            foreach ($pages_transcribed as $i => $page) {
                try {
                    $pageId = $this->getPageId($docId, $page);
                    $page_info = $this->getSystemManager()->getDocumentManager()->getPageInfo($pageId);
                    $numCols = $page_info->numCols;
                    $seq = $this->getSeq($docId, $page);
                    // iterate over all columns of the page and get the corresponding transcripts and transcribers
                    for ($col = 1; $col <= $numCols; $col++) {
                        $versions = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager()->getColumnVersionInfoByPageCol($pageId, $col);
                        if (count($versions) === 0) {
                            // no transcription in this column
                            continue;
                        }

                        $transcription = $this->getTranscription($docId, $page, $col);
                        $transcriber = $this->getTranscriber($docId, $page, $col);

                        // get language of the current column (same as the document)
                        $lang = $this->getLang($pageId);

                        // get the foliation number of the current page/sequence number
                        $foliation = $this->getFoliation($docId, $page);

                        // get timestamp
                        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();
                        $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($pageId, $col);
                        $currentVersionInfo = (array)(end($versionsInfo));
                        $timeFrom = (string)$currentVersionInfo['timeFrom'];
                        $this->indexTranscription($this->client, null, $title, $page, $seq, $foliation, $col, $transcriber, $pageId, $docId, $transcription, $lang, $timeFrom);
                    }

                    $pagesIndexed++;
                    $totalTime = microtime(true) - $absStart;
                    $timePerPage = $totalTime / $pagesIndexed;
                    $estTotalTime = intval($timePerPage * $transcribedPageCount);
                    $remainingTime = intval($timePerPage * ($transcribedPageCount - $pagesIndexed));
                    printf("%05d of %d pages indexed (%.2f%%) : Time elapsed %s : Est. Total %s : Est. Remaining %s : Doc %d, page %d of %d, %-50s\r" ,
                        $pagesIndexed, $transcribedPageCount, 100 * $pagesIndexed / $transcribedPageCount,
                        DateTimeFormat::getFormattedTime($totalTime),
                        DateTimeFormat::getFormattedTime($estTotalTime),
                        DateTimeFormat::getFormattedTime($remainingTime),
                        $docId, $i+1, $pageCount, $title
                    );
                } catch (DocumentNotFoundException|PageNotFoundException|InvalidTimeStringException|EntityDoesNotExistException $e) {
                    printf("\nERROR while processing page %d (id %s): '%s'\n", $i+1, $pageId, $e->getMessage());
                }
            }
        }


        printf("%d pages indexed in total\n", $pagesIndexed);
        $elapsedTime = time() - $absStart;

        printf("Done in %.2f minutes, %.2f secs/doc,  %.2f secs/page\n",
            $elapsedTime / 60, $elapsedTime / count ($docIds), $elapsedTime/$pagesIndexed);

    }

    /**
     * @param string $doc_id
     * @return string
     * @throws DocumentNotFoundException
     */
    public function getTitle(string $doc_id): string
    {
        $doc_info = $this->getSystemManager()->getDocumentManager()->getLegacyDocInfo((int)$doc_id);
        return $doc_info['title'];
    }

    /**
     * @param int $docId
     * @param int $page
     * @return int
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     */
    private function getPageId(int $docId, int $page): int
    {
        return $this->getSystemManager()->getDocumentManager()->getpageIdByDocPage($docId, $page);
    }

    /**
     * @param int $docId
     * @param int $page
     * @return string
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     */
    public function getSeq(int $docId, int $page): string
    {
        $pageId = $this->getSystemManager()->getDocumentManager()->getPageIdByDocPage($docId, $page);
        $pageInfo = $this->getSystemManager()->getDocumentManager()->getPageInfo($pageId);
        return $pageInfo->sequence;
    }

    /**
     * @param int $doc_id
     * @param int $page
     * @param int $col
     * @return string
     * @throws DocumentNotFoundException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function getTranscription(int $doc_id, int $page, int $col): string
    {
        $page_id = $this->getSystemManager()->getDocumentManager()->getPageIdByDocPage($doc_id, $page);
        $elements = $this->getSystemManager()->getTranscriptionManager()->getColumnElementsBypageID($page_id, $col);
        //print_r($elements);
        return $this->getPlainTextFromElements($elements);
    }

    /**
     * @throws PageNotFoundException
     * @throws EntityDoesNotExistException
     * @throws DocumentNotFoundException
     */
    private function getTranscriber(int $doc_id, int $page, int $col): string
    {
        $page_id = $this->getSystemManager()->getDocumentManager()->getPageIdByDocPage($doc_id, $page);
        $versions = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager()->getColumnVersionInfoByPageCol($page_id, $col);

        if ($versions === []) {
            return '';
        } else {
            $transcriptions_version = count($versions) - 1;
            $authorTid = $versions[$transcriptions_version]->authorTid;
            return $this->getSystemManager()->getEntitySystem()->getEntityName($authorTid);
        }
    }

    /**
     * @param string $pageId
     * @return string
     * @throws PageNotFoundException
     */
    private function getLang(string $pageId): string
    {
        $langId = $this->getSystemManager()->getDocumentManager()->getPageInfo($pageId)->lang;

        return match ($langId) {
            Entity::LangLatin => 'la',
            Entity::LangArabic => 'ar',
            Entity::LangHebrew => 'he',
            Entity::LangJudeoArabic => 'jrb',
            default => false,
        };

    }

    /**
     * @param int $doc_id
     * @param int $page
     * @return string
     */
    public function getFoliation(int $doc_id, int $page): string
    {
        try {
            $seq = $this->getSeq($doc_id, $page);
            $info = $this->getSystemManager()->getTranscriptionManager()->getPageInfoByDocSeq($doc_id, $seq);
        } catch (DocumentNotFoundException|PageNotFoundException) {
            return '';
        }
        return $info->foliation;
    }

    /**
     * Encodes and cleans text for the lemmatizer.
     * @param string $text
     * @return string
     */
    private function encodeForLemmatization(string $text): string
    {

        $text_clean = str_replace("\n", " ", $text);
        $text_clean = str_replace(' ', ' ', $text_clean);
        $text_clean = str_replace(' ', ' ', $text_clean);
        return str_replace('- ', '', $text_clean);
    }

    /**
     * Builds the editions index in typesense after getting all relevant data from the sql database.
     * @return void
     */
    private function buildIndexEditions(): void {
        // get collationTableManager
        $ctm = $this->getSystemManager()->getCollationTableManager();

        $tablesInfo = $ctm->getTablesInfo();

        $editionIds = [];

        foreach ($tablesInfo as $tableInfo) {
            if ($tableInfo['type'] === 'edition') {
                $editionIds[] = $tableInfo['id'];
            }
        }

        $this->logger->debug(sprintf("There are %d active tables in the system of which %d are editions",
            count($tablesInfo), count($editionIds)));

        // print_r($editionIds);

        foreach ($editionIds as $id) {
            $edition =  $this->getEditionData($ctm, $id);
            if (count($edition) === 0) {
                // empty data
                $this->logger->info("Edition $id returned empty data, skipping");
                continue;
            }

            $this->indexEdition($this->client, null, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id'], $edition['timeFrom']);
            $log_data = 'Title: ' . $edition['title'] . ', Editor: ' . $edition['editor'] . ', Table ID: ' . $edition['table_id'] . ', Chunk: ' . $edition['chunk_id'] . ", TimeFrom: " . $edition['timeFrom'];
            $this->logger->debug("Indexed Edition – $log_data\n");
        }
    }

    /**
     * Adds a new item to the transcription or editions index.
     * @param string $arg1 , page ID in case of transcriptions, table ID for editions
     * @param string|null $arg2 column no. in case of transcriptions
     * @param string|null $id , open search id for the item, only necessary when an already indexed item with a given id becomes updated
     * @param string|null $context , determines if the method is called in an updating process and if so, modifies its behavior slightly
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function addItem(string $arg1, string $arg2 = null, string $id = null, string $context = null): void
    {

        if ($this->isAlreadyIndexed($arg1, $arg2) and $context !== 'update') {
            print ("Item is already indexed in the corresponding index. Do you want to update it? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->updateItem($arg1, $arg2);
            }

            return;
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

    }

    /**
     * Returns the doc id of a transcribed page.
     * @param string $pageID
     * @return string
     * @throws DocumentNotFoundException|PageNotFoundException
     */
    private function getDocIdByPageId(string $pageID): string
    {

        $docList = $this->getSystemManager()->getEntitySystem()->getAllEntitiesForType(Entity::tDocument);

        foreach ($docList as $doc) {
            $pages_transcribed = $this->getSystemManager()->getTranscriptionManager()->getTranscribedPageListByDocId($doc);
            foreach ($pages_transcribed as $page_transcribed) {
                $currentPageID = $this->getPageId($doc, $page_transcribed);
                if ((string)$currentPageID === $pageID) {
                    return $doc;
                }
            }
        }

        return '';
    }

    /**
     * Returns information about an item in the sql database.
     * @param string $arg1 , page ID in case of transcriptions, table ID for editions
     * @param string|null $arg2 , column number for transcriptions
     * @return array
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function getItemInfoFromDatabase(string $arg1, string $arg2 = null): array
    {

        return match ($this->indexNamePrefix) {
            'transcriptions' => $this->getTranscriptionInfoFromDatabase($arg1, $arg2),
            'editions' => $this->getEditionInfoFromDatabase($arg1),
            default => [],
        };
    }



    /**
     * If called without values for any argument, the completeness of an index will be checked by comparison of its contents with the data in the corresponding sql database.
     * If called with values for the arguments 1 and 2 – in case of editions only argument 1 – the correctness of a single item will be checked.
     * If 'fix' is true, not indexed or not updated items will be indexed or updated automatically
     * @param string|null $arg1 , page ID for transcriptions, table ID for editions
     * @param string|null $arg2 , column number for transcriptions
     * @param bool $fix
     * @return void
     * @throws DocumentNotFoundException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException|EntityDoesNotExistException
     */
    private function checkIndex(string $arg1 = null, string $arg2 = null, bool $fix = false): void
    {

        print ("Checking index '$this->indexNamePrefix'...\n");

        switch ($this->indexNamePrefix) {
            case 'transcriptions':
                if ($arg1 === null) {
                    $this->checkIndexTranscriptions($fix);
                } else {
                    $this->checkSingleTranscription($arg1, $arg2, $fix);
                }
                break;
            case 'editions':
                if ($arg1 === null) {
                    $this->checkIndexEditions($fix);
                } else {
                    $this->checkSingleEdition($arg1, $fix);
                }
                break;
        }
    }

    /**
     * Gets all data for editions from the sql database and from the open search index, then compares them and checks the completeness of the index.
     * If 'fix' is true, not indexed or outdated editions will be indexed or updated.
     * @param bool $fix
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function checkIndexEditions (bool $fix): void {

        // get collationTableManager
        $ctm = $this->getSystemManager()->getCollationTableManager();

        print "Getting summary from database...";
        $tablesInfo = $ctm->getTablesInfo();
        print "done\n";

        $editionIds = [];

        foreach ($tablesInfo as $tableInfo) {
            if ($tableInfo['type'] === 'edition') {
                $editionIds[] = $tableInfo['id'];
            }
        }

        printf("There are %d active tables in the system of which %d are editions\n",
            count($tablesInfo), count($editionIds));

        print "Getting edition data...\n";

        $editionsInDatabase = [];

        foreach ($editionIds as $i => $id) {
            if ($i % 10 === 0) {
                print "   $i editions processed\r";
            }
            $edition =  $this->getEditionData($ctm, $id);
            if (count($edition) === 0) {
                continue;
            }

            $editionsInDatabase[] = [(string) $edition['table_id'], (string) $edition['chunk_id'], (string) $edition['timeFrom'], $edition['text']]; ;
        }

        printf("   %d editions processed", count($editionIds));

        print "\nGetting data from index...";

        // get all relevant data from the index
        $indexedEditions = [];

        foreach ($this->indices as $indexName) {

            $hits = $this->getItemsFromIndex($indexName);

            foreach ($hits as $hit) {
                $tableID = (string) $hit['document']['table_id'];
                $chunk = (string) $hit['document']['chunk'];
                $timeFrom = (string) $hit['document']['timeFrom'];
                $edition_tokens = $hit['document']['edition_tokens'];
                $edition_lemmata = $hit['document']['edition_lemmata'];
                $indexedEditions[] = [$tableID, $chunk, $timeFrom, $edition_tokens, $edition_lemmata];
            }
        }
        print "done\n";

        printf("There are %d editions in the index\n", count($indexedEditions));


        // check if every edition from the database is indexed in the most up-to-date version

        print "Comparing data...";
        $checkResults = $this->compareDataFromDatabaseAndIndex($editionsInDatabase, $indexedEditions);

        $this->evaluateCheckResults($checkResults, $fix);

    }

    /**
     * Gets all data for transcriptions from the sql database and from the open search index, then compares them and checks the completeness of the index.
     * If 'fix' is true, not indexed or outdated transcriptions will be indexed or updated.
     * @param bool $fix
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function checkIndexTranscriptions(bool $fix): void
    {

        // get versionManager
        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();

        // get a list of triples with data about all transcribed columns, their pageIDs and their timestamps from the database
        $columnsInDatabase = [];

        $docs = $this->getSystemManager()->getEntitySystem()->getAllEntitiesForType(Entity::tDocument);
        shuffle($docs); // this is only done to have a temporally more uniform process of transcribed pages, in the given order to the last docs in the array belong much lesser transcribed pages
        printf("Found %d documents in the entity system.\n", count($docs));

        foreach ($docs as $i=>$doc) {

            // get a list of transcribed pages of the document
            $pages_transcribed = $this->getSystemManager()->getTranscriptionManager()->getTranscribedPageListByDocId($doc);

            foreach ($pages_transcribed as $page) {

                $page_id = $this->getPageId($doc, $page);
                $page_info = $this->getSystemManager()->getDocumentManager()->getPageInfo($page_id);
                $num_cols = $page_info->numCols;
                $docID = $page_info->docId;

                for ($col = 1; $col <= $num_cols; $col++) {

                    $versions = $versionManager->getColumnVersionInfoByPageCol($page_id, $col);
                    if (count($versions) === 0) {
                        // no transcription in this column
                        continue;
                    }

                    // get timestamp
                    $currentVersionInfo = (array)(end($versions));
                    $timeFrom = (string) $currentVersionInfo['timeFrom'];
                    $transcription= $this->getTranscription($docID, $page, $col);
                    $columnsInDatabase[] = [(string) $page_id, (string) $col, $timeFrom, $transcription];
                }
            }

            $i++;
            if ($i % 10 === 0) {
                print "   $i documents processed\r";
            }

        }

        // get all relevant data from the Typesense index
        $indexedColumns = [];

        foreach ($this->indices as $indexName) {

            $hits = $this->getItemsFromIndex($indexName);

            foreach ($hits as $i=>$hit) {
                $page_id = (string) $hit['document']['pageID'];
                $col = (string) $hit['document']['column'];
                $timeFrom = (string) $hit['document']['time_from'];
                $transcription_tokens = $hit['document']['transcription_tokens'];
                $transcription_lemmata = $hit['document']['transcription_lemmata'];
                $indexedColumns[] = [$page_id, $col, $timeFrom, $transcription_tokens, $transcription_lemmata];

            }
            printf("Processed %d columns from the index '$indexName'.\n", count($hits));
        }

        print("Comparing data...");

        // check if every column from the database is indexed in the most up-to-date version
        $checkResults = $this->compareDataFromDatabaseAndIndex($columnsInDatabase, $indexedColumns);

        $this->evaluateCheckResults($checkResults, $fix);

    }

    /**
     * Compares transcription or edition data from the sql database with data from the open search index and returns
     * information about not indexed and not updated items.
     * @param array $dbData
     * @param array $indexData
     * @return array
     */
    private function compareDataFromDatabaseAndIndex(array $dbData, array $indexData): array
    {
        $notIndexedItems = [];
        $notUpdatedItems = [];
        $notInDatabaseItems = [];
        $emptyItems = [];
        $numNotIndexedItems = 0;
        $numNotUpdatedItems = 0;
        $numNotInDatabaseItems = 0;
        $numEmptyItems = 0;
        $numItemsInDatabase = count($dbData);

        // iterate over dbData
        foreach ($dbData as $dbItem) {
            $foundInIndex = false;

            foreach ($indexData as $indexedItem) {

                // compare the items without looking at their timestamps
                if (array_slice($dbItem, 0, 2) === array_slice($indexedItem, 0, 2)) {
                    $foundInIndex = true;

                    // if items matched, compare their timestamps
                    if ($dbItem[2] !== $indexedItem[2]) {
                        $numNotUpdatedItems++;
                        $notUpdatedItems[] = [$dbItem[0], $dbItem[1]];
                    } else if (($indexedItem[3] === [] || $indexedItem[4] === []) &&
                        (preg_match("/[a-z]/i", $dbItem[3]) or
                            preg_match('/\p{Hebrew}/u', $dbItem[3]) or
                            preg_match('/\p{Arabic}/u', $dbItem[3]))) {
                        $numEmptyItems++;
                        $emptyItems[] = [$dbItem[0], $dbItem[1]];
                    }
                    break;
                }
            }

            // mark item as not indexed
            if (!$foundInIndex) {
                $numNotIndexedItems++;
                $notIndexedItems[] = [$dbItem[0], $dbItem[1]];
            }
        }

        // check for items in the index, that are not in the database without looking at their timestamps
        foreach ($indexData as $indexedItem) {
            $foundInDb = false;

            foreach ($dbData as $dbItem) {
                if (array_slice($indexedItem, 0, 2) === array_slice($dbItem, 0, 2)) {
                    $foundInDb = true;
                    break;
                }
            }

            if (!$foundInDb) {
                $numNotInDatabaseItems++;
                $notInDatabaseItems[] = $indexedItem[0];
            }
        }

        if ($numNotIndexedItems === 0 && $numNotUpdatedItems === 0 && $numEmptyItems === 0) {
            print ("\nINDEX IS COMPLETE!\n");
        } else {
            print ("\nINDEX IS NOT COMPLETE!\n
            $numNotIndexedItems of $numItemsInDatabase items not indexed.\n
            $numNotUpdatedItems of $numItemsInDatabase items not up to date.\n
            $numEmptyItems of $numItemsInDatabase items have an empty list of tokens or lemmata.\n");
        }

        if ($numNotInDatabaseItems !== 0) {
            print("\nINFO: The index contains $numNotInDatabaseItems items which could not be found in the database. Their ids are:\n");
            print(implode(", ", $notInDatabaseItems) . "\n");
        }

        return ['notIndexed' => $notIndexedItems, 'outdated' => $notUpdatedItems, 'empty' => $emptyItems, 'numNotIndexedItems' => $numNotIndexedItems, 'numNotUpdatedItems' => $numNotUpdatedItems, 'numEmptyItems' => $numEmptyItems];
    }


    /**
     * Evaluates given check results and communicates information about them to the user.
     * If wished, automatically fixes an index on the basis of the given check results.
     * @param array $checkResults
     * @param bool $fix
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function evaluateCheckResults(array $checkResults, bool $fix): void
    {
        // fix index if possible and desired
        if (!$fix and ($checkResults['numNotIndexedItems'] !== 0 or $checkResults['numNotUpdatedItems'] !== 0 or $checkResults['numEmptyItems'] !== 0)) {
            print ("Do you want to fix the index? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->fixIndex($checkResults);
            }
        } else if ($fix and $checkResults['numNotIndexedItems'] === 0 and $checkResults['numNotUpdatedItems'] === 0 and $checkResults['numEmptyItems'] === 0) {
            print ("Index cannot and needs not to be fixed.\n");
        } else if ($fix) {
            $this->fixIndex($checkResults);
        }
    }

    /**
     * Fixes an index on the basis of given check results.
     * @param array $checkResults
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function fixIndex(array $checkResults): void
    {

        print("Fixing index...\n");

        foreach ($checkResults['notIndexed'] as $notIndexedItem) {
            $this->addItem($notIndexedItem[0], $notIndexedItem[1], null, 'fix');
        }

        foreach ($checkResults['outdated'] as $outdatedItem) {
            $this->updateItem($outdatedItem[0], $outdatedItem[1]);
        }

        foreach ($checkResults['empty'] as $emptyItem) {
            $this->updateItem($emptyItem[0], $emptyItem[1]);
        }
    }

    /**
     * Checks if a given transcription is already indexed and up to date. If fix is true, a not indexed transcription will be indexed and
     * an outdated transcription will be updated.
     * @param string $pageID
     * @param string $col
     * @param bool $fix
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function checkSingleTranscription(string $pageID, string $col, bool $fix): void
    {

        try {
            $page_info = $this->getSystemManager()->getDocumentManager()->getPageInfo($pageID);
        } catch (Exception $e) {
            print("No page with ID $pageID found in the database.\n");
            return;
        }

        if ($page_info->numCols === 0) {
            print("No columns for the page with ID $pageID found in the database.\n");
            return;
        }

        $docID = $page_info->docId;
        $page = $page_info->pageNumber;
        $transcription = $this->getTranscription($docID, $page, $col);

        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();
        $versions = $versionManager->getColumnVersionInfoByPageCol($pageID, $col);
        $currentVersionInfo = (array)(end($versions));
        $timeFrom = (string) $currentVersionInfo['timeFrom'];

        $transcriptionInDatabase = ['transcription' => $transcription, 'timeFrom' => $timeFrom];


        if ($transcriptionInDatabase === []) {
            return;
        }

        $transcriptionInIndex = $this->getIndexedItemInfo($pageID, $col);

        if ($transcriptionInIndex === [] or !isset($transcriptionInIndex['time_from'])) {
            print("\nTranscription is NOT INDEXED!\n");

            if ($fix) {
                $this->addItem($pageID, $col);
            } else {
                print ("Do you want to index it? (y/n)\n");
                $input = rtrim(fgets(STDIN));

                if ($input === 'y') {
                    $this->addItem($pageID, $col);
                }
            }
        } else if ($transcriptionInIndex['time_from'] === $transcriptionInDatabase['timeFrom']) {
            print("\nTranscription in index is up to date!\n");

            if (($transcriptionInIndex['transcription_tokens'] === [] || $transcriptionInIndex['transcription_lemmata'] === []) &&
                (preg_match("/[a-z]/i", $transcriptionInDatabase['transcription']) or
                    preg_match('/\p{Hebrew}/u', $transcriptionInDatabase['transcription']) or
                    preg_match('/\p{Arabic}/u', $transcriptionInDatabase['transcription']))) {
                print("\nBut the transcription and/or its lemmatized version is empty!\n");

                if ($fix) {
                    $this->updateItem($pageID, $col);
                } else {
                    print ("Do you want to reindex the transcription? (y/n)\n");
                    $input = rtrim(fgets(STDIN));

                    if ($input === 'y') {
                        $this->updateItem($pageID, $col);
                    }
                }
            }

        } else {
            print("\nTranscription in index is OUTDATED!\n");

            if ($fix) {
                $this->updateItem($pageID, $col);
            } else {
                print ("Do you want to update it? (y/n)\n");
                $input = rtrim(fgets(STDIN));

                if ($input === 'y') {
                    $this->updateItem($pageID, $col);
                }
            }
        }

    }

    /**
     * Checks if a given edition is already indexed and up to date. If 'fix' is true, a not indexed edition will be indexed and
     * an outdated edition will be updated.
     * @param string $tableID
     * @param bool $fix
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function checkSingleEdition(string $tableID, bool $fix): void
    {

        $editionInDatabase = $this->getEditionInfoFromDatabase($tableID);

        if ($editionInDatabase === []) {
            return;
        }

        $editionInIndex = $this->getIndexedItemInfo($tableID);

        if ($editionInIndex === []) {
            print("\nEdition is NOT INDEXED!\n");

            if ($fix) {
                $this->addItem($tableID);
            } else {
                print ("Do you want to index it? (y/n)\n");
                $input = rtrim(fgets(STDIN));

                if ($input === 'y') {
                    $this->addItem($tableID);
                }
            }
        } else if ($editionInIndex['timeFrom'] === $editionInDatabase['timeFrom']) {
            print("\nIndexed edition is up to date!\n");

            if (($editionInIndex['edition_tokens'] === [] || $editionInIndex['edition_lemmata'] === []) &&
                (preg_match("/[a-z]/i", $editionInDatabase['text']) or
                    preg_match('/\p{Hebrew}/u', $editionInDatabase['text']) or
                    preg_match('/\p{Arabic}/u', $editionInDatabase['text']))) {
                print("\nBut the edition and/or its lemmatized version is empty!\n");

                if ($fix) {
                    $this->updateItem($tableID);
                } else {
                    print ("Do you want to reindex the edition? (y/n)\n");
                    $input = rtrim(fgets(STDIN));

                    if ($input === 'y') {
                        $this->updateItem($tableID);
                    }
                }
            }

        } else {
            print("\nIndexed edition is OUTDATED!\n");

            if ($fix) {
                $this->updateItem($tableID);
            } else {
                print ("Do you want to update it? (y/n)\n");
                $input = rtrim(fgets(STDIN));

                if ($input === 'y') {
                    $this->updateItem($tableID);
                }
            }
        }

    }

    /**
     * Checks the completeness of an index and fixes it.
     * @param string|null $arg1
     * @param string|null $arg2
     * @throws DocumentNotFoundException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException|EntityDoesNotExistException
     */
    private function checkAndFixIndex(string $arg1 = null, string $arg2 = null): void
    {
        $this->checkIndex($arg1, $arg2, true);
    }


    /**
     * Adds a transcription to the index.
     * @param string $pageID
     * @param string $col
     * @param string|null $id , null if the adding is not part of an updating process
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function addItemToTranscriptionsIndex (string $pageID, string $col, string $id = null): void {

        try {
            $doc_id = $this->getDocIdByPageId($pageID);
        } catch (DocumentNotFoundException|PageNotFoundException) {
            print("No transcription in database with page id $pageID and column number $col.\n");
            return;
        }
        // Get other relevant data for indexing
        $title = $this->getTitle($doc_id);
        $page = $this->getSystemManager()->getDocumentManager()->getPageInfo($pageID)->pageNumber;
        $seq = $this->getSeq($doc_id, $page);
        $foliation = $this->getFoliation($doc_id, $page);
        $transcriber = $this->getTranscriber($doc_id, $page, $col);
        $transcription = $this->getTranscription($doc_id, $page, $col);
        $lang = $this->getLang($pageID);

        // Get timestamp
        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();
        $versions = $versionManager->getColumnVersionInfoByPageCol($pageID, $col);
        $currentVersionInfo = (array)(end($versions));
        $timeFrom = (string) $currentVersionInfo['timeFrom'];

        if ($timeFrom === '') {
            print("No transcription in database with page id $pageID and column number $col.\n");
            return;
        }

        $this->indexTranscription($this->client, $id, $title, $page, $seq, $foliation, $col, $transcriber, $pageID, $doc_id, $transcription, $lang, $timeFrom);

    }

    /**
     * Adds an edition to the index.
     * @param string $tableID
     * @param string|null $id , null if the adding is not part of an updating process
     * @return void
     */
    private function addItemToEditionsIndex (string $tableID, string $id = null): void {

        // get collationTableManager
        $ctm = $this->getSystemManager()->getCollationTableManager();

        try {
            $edition = $this->getEditionData($ctm, $tableID);
        } catch (Exception) {
            print ("No edition in database with table id $tableID.\n");
        }

        // Clean data
        $edition = $this->cleanEditionData([$edition])[0];

        // Index editions
        $editionExists = false;

        if ($edition['table_id'] === (int) $tableID) {
            $this->indexEdition($this->client, $id, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id'], $edition['timeFrom']);
            $log_data = 'Title: ' . $edition['title'] . ', Editor: ' . $edition['editor'] . ', Table ID: ' . $edition['table_id'] . ', Chunk: ' . $edition['chunk_id'] . ", TimeFrom: " . $edition['timeFrom'];
            $this->logger->debug("Indexed Edition – $log_data\n");
            $editionExists = true;
        }

        if (!$editionExists) {
            print ("No edition in database with table id $tableID.\n");
        }
    }

    /**
     * Checks if the target item is already indexed, and if so, removes it and adds it again in the latest version from sql database.
     * @param string $arg1, page id in case of transcriptions, table id in case of editions
     * @param string|null $arg2 column number in case of transcriptions
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function updateItem (string $arg1, string $arg2 = null): void {

        if (!$this->isAlreadyIndexed($arg1, $arg2)) {
            print ("Item is not yet indexed and therefore cannot be updated.\nDo you want to index it? (y/n)\n");
            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->addItem($arg1, $arg2);
            }
            return;
        }

        print ("Updating...\n");

        $id = $this->getTypesenseIdAndIndexName($arg1, $arg2)['id'];
        $this->removeItem($arg1, $arg2, 'update');
        $this->addItem($arg1, $arg2, $id, 'update');

    }

    /**
     * Updates the target item if already indexed, otherwise adds it as a new item to the target index
     * @param string $tableOrDocId
     * @param string|null $columnNumber
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    public function updateOrAddItem(string $tableOrDocId, string $columnNumber = null): void
    {
        if (!$this->isAlreadyIndexed($tableOrDocId, $columnNumber)) {
            $this->addItem($tableOrDocId, $columnNumber);

        } else {
            $id = $this->getTypesenseIdAndIndexName($tableOrDocId, $columnNumber)['id'];
            $this->removeItem($tableOrDocId, $columnNumber, 'update');
            $this->addItem($tableOrDocId, $columnNumber, $id, 'update');
        }

    }

    /**
     * Removes an item from an index.
     * @param string $arg1
     * @param string|null $arg2
     * @param string $context, value 'update' adjusts the communication behavior of the method to its role in an updating process
     * @return bool
     */
    private function removeItem (string $arg1, string $arg2 = null, string $context = 'remove'): void {

        if ($context !== 'update') {
            print ("Removing...\n");
        }

        $data = $this->getTypesenseIdAndIndexName($arg1, $arg2);

        if (isset($data['id'])) {

            $index = $data['index'];
            $id = $data['id'];

            $this->client->collections[$index]->documents[$id]->delete();

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
    }

    /**
     * Returns information about a transcription in the sql database.
     * @param string $pageID
     * @param string $col
     * @return array
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function getTranscriptionInfoFromDatabase (string $pageID, string $col): array {

        $doc_id = $this->getDocIdByPageId($pageID);

        if ($doc_id === '') {
            print("\nNo transcription in database with page id $pageID and column number $col.\n");
            return [];
        }

        // Get other relevant data for indexing
        $title = $this->getTitle($doc_id);
        $page = $this->getSystemManager()->getDocumentManager()->getPageInfo($pageID)->pageNumber;
        $seq = $this->getSeq($doc_id, $page);
        $foliation = $this->getFoliation($doc_id, $page);
        $transcriber = $this->getTranscriber($doc_id, $page,  $col);
        $transcription = $this->getTranscription($doc_id, $page, $col);
        $lang = $this->getLang($pageID);

        // Get timestamp
        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();
        $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($pageID, $col);
        $currentVersionInfo = (array)(end($versionsInfo));

        if (!isset($currentVersionInfo['timeFrom'])) {
            print("\nNo transcription in database with page id $pageID and column number $col.\n");
            return [];
        } else {
            $timeFrom = (string) $currentVersionInfo['timeFrom'];
        }

        return ['title' => $title,
            'page' => $page,
            'seq' => $seq,
            'foliation' => $foliation,
            'transcriber' => $transcriber,
            'transcription' => $transcription,
            'lang' => $lang,
            'timeFrom' => $timeFrom];
    }

    /**
     * Returns information about an edition from the sql database.
     * @param string $tableID
     * @return array
     */
    private function getEditionInfoFromDatabase (string $tableID): array  {

        // get collationTableManager
        $ctm = $this->getSystemManager()->getCollationTableManager();

        try {
            $edition = $this->getEditionData($ctm, $tableID);
        } catch (Exception) {
            print ("\nNo edition in database with table id $tableID.\n");
            return [];
        }

        if ($edition === []) {
            print ("\nNo edition in database with table id $tableID.\n");
            return [];
        }

        // clean data
        $edition = $this->cleanEditionData([$edition])[0];

        // index editions
        $editionExists = false;

        if ($edition['table_id'] === (int) $tableID) {
            $data = ['title' => $edition['title'],
                'editor' => $edition['editor'],
                'table_id' => $edition['table_id'],
                'chunk' => $edition['chunk_id'],
                'text' => $edition['text'],
                "timeFrom" => $edition['timeFrom']];

            $editionExists = true;
        }

        if (!$editionExists) {
            print ("\nNo edition in database with table id $tableID.\n");
            return [];
        }

        return $data;
    }

    /**
     * Returns information about an indexed item.
     * @param string $arg1 , page ID in case of transcriptions, table ID for editions
     * @param string|null $arg2 , column number for transcriptions
     * @param string|null $context , value 'show' adjusts the behavior of the method to the process of only showing information about an indexed item
     * @return array
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     * @throws TypesenseClientError
     * @throws \Http\Client\Exception
     */
    private function getIndexedItemInfo (string $arg1, string $arg2 = null, string $context = null): array {

        if ($this->indexNamePrefix === 'transcriptions') {
            $searchParameters = ['q' => $arg1, 'query_by' => 'pageID', 'prefix' => false, 'num_typos' => 0, 'filter_by' => "column:=$arg2"];
        } else if ($this->indexNamePrefix === 'editions') {
            $searchParameters = ['q' => $arg1, 'query_by' => 'table_id', 'prefix' => false, 'num_typos' => 0];
        }

        foreach ($this->indices as $indexName) {

            $data = $this->client->collections[$indexName]->documents->search($searchParameters);

            if ($data['found'] === 1) {
                return ($data['hits'][0]['document']);
            } else if ($data['found'] > 1)  {
                print("ERROR IN INDEX! Found more than one item matching the given identifier!\n");
            }
        }

        if ($context === 'show') {
            print("Item not indexed!\nDo you want to index it? (y/n)\n");

            $input = rtrim(fgets(STDIN));

            if ($input === 'y') {
                $this->addItem($arg1, $arg2);
            }
        }

        return [];
    }

    /**
     * @param string $indexName
     * @return array
     */
    private function getItemsFromIndex(string $indexName): array {
        $query=['hits' => [1]];
        $hits = [];
        $page=1;

        // collect all documents from the index
        while (count($query['hits']) !== 0) {
            $searchParameters = [
                'q' => '*',
                'page' => $page,
                'limit' => 250
            ];

            try {
                $query = $this->client->collections[$indexName]->documents->search($searchParameters);
            } catch (\Http\Client\Exception|TypesenseClientError $e) {
                return [];
            }

            foreach ($query['hits'] as $hit) {
                $hits[] = $hit;
            }

            $page++;
        }

        return $hits;
    }

    /**
     * Checks if an item is already indexed.
     * @param string $id , page ID in case of transcriptions, table ID for editions
     * @param string|null $columnNumber , column number for transcriptions
     * @return bool
     */
    private function isAlreadyIndexed (string $id, string $columnNumber=null): bool {
        if (!isset($this->getTypesenseIdAndIndexName($id, $columnNumber)['id'])) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Returns Typesense id and index name of the target item
     * @param string $id , page ID in case of transcriptions, table ID for editions
     * @param string|null $columnNumber , column number for transcriptions
     * @return array
     */
    private function getTypesenseIdAndIndexName (string $id, string $columnNumber=null): array {

        if ($this->indexNamePrefix === 'transcriptions') {
            $searchParameters = ['q' => $id, 'query_by' => 'pageID', 'filter_by' => "column:=$columnNumber", 'prefix' => false, 'num_typos' => 0];
        } else if ($this->indexNamePrefix === 'editions') {
            $searchParameters = ['q' => $id, 'query_by' => 'table_id', 'prefix' => false, 'num_typos' => 0];
        } else {
            return [];
        }

        foreach ($this->indices as $index) {
            try {
                $query = $this->client->collections[$index]->documents->search($searchParameters);
                if ($query['found'] !== 0) {
                    return ['index' => $index, 'id' => $query['hits'][0]['document']['id']];
                }
            } catch (\Http\Client\Exception|TypesenseClientError $e) {
                $this->logger->error("Exception searching for index $id:$columnNumber: " . $e->getMessage());
                return [];
            }
        }

        return [];
    }

    /**
     * Indexes a transcription with a given open search id or with an automatically generated one.
     * @param $client
     * @param string|null $id null, if it should be generated automatically. Normally not null in an update process.
     * @param string $title
     * @param int $page
     * @param int $seq
     * @param string $foliation
     * @param int $col
     * @param string $transcriber
     * @param int $page_id
     * @param int $doc_id
     * @param string $transcription
     * @param string $lang
     * @param string $timeFrom
     * @return void
     */
    private function indexTranscription ($client, ?string $id, string $title, int $page, int $seq, string $foliation, int $col, string $transcriber, int $page_id, int $doc_id, string $transcription, string $lang, string $timeFrom): void {

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

            $tokens_and_lemmata = Lemmatizer::runLemmatizer($lang, $transcription_clean, $this->getSystemManager()->getDirectoryDataCache());

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

        $client->collections[$indexName]->documents->create([
            'title' => $title,
            'page' => $page,
            'seq' => $seq,
            'foliation' => $foliation,
            'column' => (string) $col,
            'pageID' => (string) $page_id,
            'docID' => $doc_id,
            'lang' => $lang,
            'creator' => $transcriber,
            'transcription_tokens' => $transcription_tokenized,
            'transcription_lemmata' => $transcription_lemmatized,
            'time_from' => $timeFrom
        ]);

        $this->logger->debug("Indexed Document in $indexName – Doc ID: $doc_id ($title) Page ID: $page_id Page: $page Seq: $seq Foliation: $foliation Column: $col Transcriber: $transcriber Lang: $lang TimeFrom: $timeFrom\n");
    }

    /**
     * Return an edition.
     * @param CollationTableManager $ctm
     * @param int $tableID
     * @return array
     */
    private function getEditionData (CollationTableManager $ctm, int $tableID): array
    {
        $edition_data = [];
        $data = $ctm->getCollationTableById($tableID);

        if ($data['type'] === 'edition' && !$data['archived']) {
            $edition_data['table_id'] = $data['tableId']; // equals $tableID
            $edition_data['edition_witness_index'] = $data['witnessOrder'][0];
            $edition_json = $data['witnesses'][$edition_data['edition_witness_index']];
            $tokens = $edition_json['tokens'];
            $versionInfo = $ctm->getCollationTableVersionManager()->getCollationTableVersionInfo($tableID);
            $editor_id = end( $versionInfo)->authorTid;
            $timeFrom = end($versionInfo)->timeFrom;
            try {
                $editor = $this->getSystemManager()->getPersonManager()->getPersonEssentialData($editor_id)->name;
            } catch (PersonNotFoundException) {
                // should never happen
                throw new \RuntimeException("Person info for $editor_id not found");
            }

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
            try {
                $edition_data['title'] = $this->getSystemManager()->getWorkManager()->getWorkDataByDareId($work_id)->title;
            } catch (WorkNotFoundException) {
                // should never happen
                throw new \RuntimeException("Work data not found for $work_id");
            }
            $edition_data['timeFrom'] = $timeFrom;
        }

        return $edition_data;
    }

    /**
     * Indexes an edition with a given open search id or with an automatically generated one.
     * @param $client
     * @param string|null $id  null, if it should be generated automatically. Normally not null in an update process.
     * @param string $editor
     * @param string $text
     * @param string $title
     * @param string $chunk
     * @param string $lang
     * @param int $table_id
     * @param string $timeFrom
     * @return void
     */
    private function indexEdition ($client, ?string $id, string $editor, string $text, string $title, string $chunk, string $lang, int $table_id, string $timeFrom): void {

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
            $tokens_and_lemmata = Lemmatizer::runLemmatizer($lang, $text_clean, $this->getSystemManager()->getDirectoryDataCache());

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

        $client->collections[$index_name]->documents->create([
            'table_id' => (string) $table_id,
            'chunk' => (int) $chunk,
            'creator' => $editor,
            'title' => $title,
            'lang' => $lang,
            'edition_tokens' => $edition_tokenized,
            'edition_lemmata' => $edition_lemmatized,
            'timeFrom' => $timeFrom
        ]);

    }

    /**
     * Removes empty editions from the editions array that contains all editions from the sql database.
     * @param array $editions
     * @return array
     */
    private function cleanEditionData (array $editions): array
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

    /**
     * Creates an empty open search index with the given name. If an index with the given name already existed, it will be deleted before.
     * @param $client
     * @param string $indexName
     * @return bool
     */
    private function resetIndex ($client, string $indexName): void {

        // delete existing and create new collection
        if ($client->collections[$indexName]->exists()) {
            $client->collections[$indexName]->delete();
        }

        // create data schemata
        if ($this->indexNamePrefix === 'transcriptions') {
            $schema = [
                'name' => $indexName,
                'fields' => [
                    [
                        'name' => 'title',
                        'type' => 'string',
                        'sort' => true
                    ],
                    [
                        'name' => 'page',
                        'type' => 'int32',
                        'sort' => true
                    ],
                    [
                        'name' => 'seq',
                        'type' => 'int32',
                        'sort' => true
                    ],
                    [
                        'name' => 'docID',
                        'type' => 'int32',
                        'sort' => true
                    ],
                    [
                        'name' => 'foliation',
                        'type' => 'string',
                        'sort' => true
                    ],
                    [
                        'name' => 'pageID',
                        'type' => 'string',
                        'sort' => true
                    ],
                    [
                        'name' => 'column',
                        'type' => 'string',
                        'sort' => true
                    ],
                    [
                        'name' => 'transcription_tokens',
                        'type' => 'string[]',
                    ],
                    [
                        'name' => 'transcription_lemmata',
                        'type' => 'string[]',
                    ],
                    [
                        'name' => 'time_from',
                        'type' => 'string',
                        'sort' => true
                    ],
                    [
                        'name' => 'lang',
                        'type' => 'string',
                    ],
                    [
                        'name' => 'creator',
                        'type' => 'string',
                        'sort' => true
                    ]
                ],
                'default_sorting_field' => 'title'
            ];
        } else if ($this->indexNamePrefix === 'editions')  {
            $schema = [
                'name' => $indexName,
                'fields' => [
                    [
                        'name' => 'title',
                        'type' => 'string',
                        'sort' => true
                    ],
                    [
                        'name' => 'table_id',
                        'type' => 'string',
                        'sort' => true
                    ],
                    [
                        'name' => 'chunk',
                        'type' => 'int32',
                        'sort' => true
                    ],
                    [
                        'name' => 'edition_tokens',
                        'type' => 'string[]',
                    ],
                    [
                        'name' => 'edition_lemmata',
                        'type' => 'string[]',
                    ],
                    [
                        'name' => 'timeFrom',
                        'type' => 'string',
                        'sort' => true
                    ],
                    [
                        'name' => 'lang',
                        'type' => 'string',
                    ],
                    [
                        'name' => 'creator',
                        'type' => 'string',
                        'sort' => true
                    ]
                ],
            ];
        }

        $client->collections->create($schema);

        $this->logger->debug("New index *$indexName* was created!\n");

    }


    /**
     * Converts column elements from the sql database into a plain text transcription (copied from the ApiTranscription class)
     * @param array $elements
     * @return string
     */
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

    public function instantiateTypesenseClient($config) : Client|bool{
        try {
            $this->client = new Client(
                [
                    'api_key' => $config[ApmConfigParameter::TYPESENSE_KEY],
                    'nodes' => [
                        [
                            'host' => $config[ApmConfigParameter::TYPESENSE_HOST], // For Typesense Cloud use xxx.a1.typesense.net
                            'port' => $config[ApmConfigParameter::TYPESENSE_PORT],      // For Typesense Cloud use 443
                            'protocol' => $config[ApmConfigParameter::TYPESENSE_PROTOCOL],      // For Typesense Cloud use https
                        ],
                    ],
                    'connection_timeout_seconds' => 2,
                ]
            );

            return $this->client;
        } catch (ConfigError) {
            return false;
        }
    }
}

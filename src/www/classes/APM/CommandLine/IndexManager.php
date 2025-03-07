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
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Lemmatizer;
use APM\System\Person\PersonNotFoundException;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\TxText\Item;
use APM\System\Work\WorkNotFoundException;
use Exception;
use OpenSearch\Client;
use ThomasInstitut\DataTable\InvalidTimeStringException;

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
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException|EntityDoesNotExistException
     */
    public function main($argc, $argv): bool
    {
        // Instantiate OpenSearch client
        $this->client = $this->getSystemManager()->getOpensearchClient();

        if ($this->client === null) {
            return false;
        }
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
                $item = $this->getIndexedItemInfo($argv[3], $argv[4], 'show');
                print_r($item);
                break;

            case 'showdb':
                print("Querying…");
                $item = $this->getItemInfoFromDatabase($argv[3], $argv[4]);
                if (count($item) !== 0) {
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
                $this->addItem($argv[3], $argv[4] ?? null);
                break;

            case 'update':
                // updates an existing item in an index
                $this->updateItem($argv[3], $argv[4] ?? null);
                break;

            case 'update-add':
                // updates an item if already indexed, otherwise adds the item to the index
                $this->updateOrAddItem($argv[3], $argv[4] ?? null);
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
        print("Usage: indexmanager [transcriptions/editions] [operation] [pageID/tableID] [column]\nAvailable operations are:\nbuild - builds the index, deletes already existing one\nadd [arg1] ([arg2]) - adds a single item to an index\nremove [arg1] ([arg2]) - removes a single item from an index\nupdate [arg1] ([arg2]) - updates an already indexed item\nshow [arg1] ([arg2]) - shows an indexed item\nshowdb [arg1] ([arg2]) - shows an item from the database\ncheck ([arg1] ([arg2])) - checks the completeness of an index in total or the correctness of a single item in it\nfix ([arg1] ([arg2])) - fixes a single item or an index in total by indexing not indexed items and updating outdated items\n");
    }

    /**
     * Builds the transcriptions or editions index in open search after getting all relevant data from the sql database. Deletes already existing transcriptions or editions index.
     * @return void
     * @throws DocumentNotFoundException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException|EntityDoesNotExistException
     */
    private function buildIndex(): void
    {

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

    /**
     * Creates an empty open search index with the given name. If an index with the given name already existed, it will be deleted before.
     * @param $client
     * @param string $indexName
     * @return void
     */
    private function resetIndex($client, string $indexName): void
    {

        // delete existing index
        if ($client->indices()->exists(['index' => $indexName])) {
            $client->indices()->delete([
                'index' => $indexName
            ]);
            $this->logger->debug("Existing index *$indexName* was deleted!\n");
        }

        // create new index
        $client->indices()->create([
            'index' => $indexName,
            'body' => [
                'settings' => [
                    'index' => [
                        'max_result_window' => 50000
                    ]
                ]
            ]
        ]);

        $this->logger->debug("New index *$indexName* was created!\n");

    }

    /**
     * Builds the transcriptions index in open search after getting all relevant data from the sql database.
     * @return void
     * @throws DocumentNotFoundException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException|EntityDoesNotExistException
     */
    private function buildIndexTranscriptions(): void
    {

        // get a list of all docIDs in the sql-database
        $doc_list = $this->getSystemManager()->getEntitySystem()->getAllEntitiesForType(Entity::tDocument);

        // get all relevant data for every transcription and index it
        foreach ($doc_list as $doc_id) {
            $this->getAndIndexTranscriptionsByDocId($doc_id);
        }

    }

    /**
     * Gets all transcriptions for a specific doc id and indexes them.
     * @param string $doc_id
     * @return void
     * @throws DocumentNotFoundException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException|EntityDoesNotExistException
     */
    private function getAndIndexTranscriptionsByDocId(string $doc_id): void
    {

        $title = $this->getTitle($doc_id);

        // get a list of transcribed pages of the document
        $pages_transcribed = $this->getSystemManager()->getTranscriptionManager()->getTranscribedPageListByDocId($doc_id);

        // iterate over transcribed pages
        foreach ($pages_transcribed as $page) {

            // get pageID, number of columns and sequence number of the page
            $page_id = $this->getPageID($doc_id, $page);
            $page_info = $this->getSystemManager()->getDocumentManager()->getPageInfo($page_id);
            $num_cols = $page_info->numCols;
            $seq = $this->getSeq($doc_id, $page);

            // iterate over all columns of the page and get the corresponding transcripts and transcribers
            for ($col = 1; $col <= $num_cols; $col++) {
                $versions = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager()->getColumnVersionInfoByPageCol($page_id, $col);
                if (count($versions) === 0) {
                    // no transcription in this column
                    continue;
                }

                $transcription = $this->getTranscription($doc_id, $page, $col);
                $transcriber = $this->getTranscriber($doc_id, $page, $col);

                // get language of current column (same as document)
                $lang = $this->getLang($page_id);

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
     * @param int $doc_id
     * @param int $page
     * @return int
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     */
    private function getPageID(int $doc_id, int $page): int
    {
        return $this->getSystemManager()->getDocumentManager()->getpageIDByDocPage($doc_id, $page);
    }

    /**
     * @param int $doc_id
     * @param int $page
     * @return string
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     */
    public function getSeq(int $doc_id, int $page): string
    {
        $page_id = $this->getSystemManager()->getDocumentManager()->getPageIdByDocPage($doc_id, $page);
        $page_info = $this->getSystemManager()->getDocumentManager()->getPageInfo($page_id);
        return $page_info->sequence;
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
//        print_r($elements);
        return $this->getPlainTextFromElements($elements);
    }

    /**
     * Converts column elements from the sql database into a plain text transcription (copied from the ApiTranscription class)
     * @param array $elements
     * @return string
     */
    private function getPlainTextFromElements(array $elements): string
    {
        $text = '';
        foreach ($elements as $element) {
            if ($element->type === Element::LINE) {
                foreach ($element->items as $item) {
                    switch ($item->type) {
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
                $text .= "\n";
            }
        }
        return $text;
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
     * @param string $page_id
     * @return string
     * @throws PageNotFoundException
     */
    private function getLang(string $page_id): string
    {
        $langId = $this->getSystemManager()->getDocumentManager()->getPageInfo($page_id)->lang;

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
     * Indexes a transcription with a given open search id or with an automatically generated one.
     * @param $client
     * @param string|null $id if null, if it should be generated automatically. Normally not null in an update process.
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
    private function indexTranscription($client, ?string $id, string $title, int $page, int $seq, string $foliation, int $col, string $transcriber, int $page_id, int $doc_id, string $transcription, string $lang, string $timeFrom): void
    {

        if ($lang != 'jrb') {
            $indexName = $this->indexNamePrefix . '_' . $lang;
        } else {
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
        } else {
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
     * Builds the editions index in open search after getting all relevant data from the sql database.
     * @return void
     */
    private function buildIndexEditions(): void
    {
        // get collationTableManager
        $ctm = $this->getSystemManager()->getCollationTableManager();

        // get the data of up to 20 000 editions
        $editions = [];
        foreach (range(1, 20000) as $id) {
            try {
                $editions[] = $this->getEditionData($ctm, $id);
            } catch (Exception) {
                $num_editions = $id - 1;
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
            $this->indexEdition($this->client, null, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id'], $edition['timeFrom']);
            $log_data = 'Title: ' . $edition['title'] . ', Editor: ' . $edition['editor'] . ', Table ID: ' . $edition['table_id'] . ', Chunk: ' . $edition['chunk_id'] . ", TimeFrom: " . $edition['timeFrom'];
            $this->logger->debug("Indexed Edition – $log_data\n");
        }

    }

    /**
     * Return an edition.
     * @param CollationTableManager $ctm
     * @param int $tableID
     * @return array
     * @throws PersonNotFoundException
     * @throws WorkNotFoundException
     */
    private function getEditionData(CollationTableManager $ctm, int $tableID): array
    {
        $edition_data = [];
        $data = $ctm->getCollationTableById($tableID);

        if ($data['type'] === 'edition') {
            $edition_data['table_id'] = $data['tableId']; // equals $tableID
            $edition_data['edition_witness_index'] = $data['witnessOrder'][0];
            $edition_json = $data['witnesses'][$edition_data['edition_witness_index']];
            $tokens = $edition_json['tokens'];
            $versionInfo = $ctm->getCollationTableVersionManager()->getCollationTableVersionInfo($tableID);
            $editor_id = end($versionInfo)->authorTid;
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
            $edition_data['title'] = $this->getSystemManager()->getWorkManager()->getWorkDataByDareId($work_id)->title;
            $edition_data['timeFrom'] = $timeFrom;
        }

        return $edition_data;
    }

    /**
     * Removes empty editions from the editions array that contains all editions from the sql database.
     * @param array $editions
     * @return array
     */
    private function cleanEditionData(array $editions): array
    {

        // remove empty editions
        foreach ($editions as $i => $edition) {

            if (count($edition) === 0) {
                unset ($editions[$i]);
            }
        }

        // update keys in editions array and get number of non-empty editions
        return array_values($editions);
    }

    /**
     * Indexes an edition with a given open search id or with an automatically generated one.
     * @param $client
     * @param string|null $id if null, if it should be generated automatically. Normally not null in an update process.
     * @param string $editor
     * @param string $text
     * @param string $title
     * @param string $chunk
     * @param string $lang
     * @param int $table_id
     * @param string $timeFrom
     * @return void
     */
    private function indexEdition($client, ?string $id, string $editor, string $text, string $title, string $chunk, string $lang, int $table_id, string $timeFrom): void
    {

        // Get name of the target index
        if ($lang != 'jrb') {
            $index_name = $this->indexNamePrefix . '_' . $lang;
        } else {
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
        } else {
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
     */
    private function getIndexedItemInfo(string $arg1, string $arg2 = null, string $context = null): array
    {

        $mustConditions = [];

        if ($this->indexNamePrefix === 'transcriptions') {
            $mustConditions[] = ['match' => ['pageID' => $arg1]];
            $mustConditions[] = ['match' => ['column' => $arg2]];
        } else if ($this->indexNamePrefix === 'editions') {
            $mustConditions[] = ['match' => ['table_id' => $arg1]];
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

        return [];
    }

    /**
     * Adds a new item to the transcriptions or editions index.
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
//            print ("Item is already indexed in the corresponding index. Do you want to update it? (y/n)\n");
//            $input = rtrim(fgets(STDIN));
//
//            if ($input === 'y') {
                $this->updateItem($arg1, $arg2);
//            }

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
     * Checks if an item is already indexed.
     * @param string $arg1 , page ID in case of transcriptions, table ID for editions
     * @param string|null $arg2 , column number for transcriptions
     * @return bool
     */
    private function isAlreadyIndexed(string $arg1, string $arg2 = null): bool
    {

        if ($this->getOpenSearchIDAndIndexName($arg1, $arg2)['id'] === null) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Returns open search id and index name of the target item
     * @param string $arg1 , page ID in case of transcriptions, table ID for editions
     * @param string|null $arg2 , column number for transcriptions
     * @return array
     */
    private function getOpenSearchIDAndIndexName(string $arg1, string $arg2 = null): array
    {

        $mustConditions = [];

        if ($this->indexNamePrefix === 'transcriptions') {
            $mustConditions[] = ['match' => ['pageID' => $arg1]];
            $mustConditions[] = ['match' => ['column' => $arg2]];
        } else if ($this->indexNamePrefix === 'editions') {
            $mustConditions[] = ['match' => ['table_id' => $arg1]];
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

        return [];
    }

    /**
     * Checks if the target item is already indexed, and if so, removes it and adds it again in the latest version from sql database.
     * @param string $arg1 , page id in case of transcriptions, table id in case of editions
     * @param string|null $arg2 column number in case of transcriptions
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function updateItem(string $arg1, string $arg2 = null): void
    {

        if (!$this->isAlreadyIndexed($arg1, $arg2)) {
//            print ("Item is not yet indexed and therefore cannot be updated.\nDo you want to index it? (y/n)\n");
//            $input = rtrim(fgets(STDIN));

//            if ($input === 'y') {
                $this->addItem($arg1, $arg2);
//            }
            return;
        }

        print ("Updating...\n");

        $id = $this->getOpenSearchIDAndIndexName($arg1, $arg2)['id'];
        $this->removeItem($arg1, $arg2, 'update');
        $this->addItem($arg1, $arg2, $id, 'update');

    }

    /**
     * Removes an item from an index.
     * @param string $arg1
     * @param string|null $arg2
     * @param string $context , value 'update' adjusts the communication behavior of the method to its role in an updating process
     * @return void
     */
    private function removeItem(string $arg1, string $arg2 = null, string $context = 'remove'): void
    {

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
    }

    /**
     * Adds a transcription to the index.
     * @param string $pageID
     * @param string $col
     * @param string|null $id , null if the adding is not part of an updating process
     * @return void
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     * @throws DocumentNotFoundException|EntityDoesNotExistException
     */
    private function addItemToTranscriptionsIndex(string $pageID, string $col, string $id = null): void
    {

        $doc_id = $this->getDocIdByPageId($pageID);

        if ($doc_id === '') {
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
        $timeFrom = (string)$currentVersionInfo['timeFrom'];

        if ($timeFrom === '') {
            print("No transcription in database with page id $pageID and column number $col.\n");
            return;
        }

        $this->indexTranscription($this->client, $id, $title, $page, $seq, $foliation, $col, $transcriber, $pageID, $doc_id, $transcription, $lang, $timeFrom);

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
                $currentPageID = $this->getPageID($doc, $page_transcribed);
                if ((string)$currentPageID === $pageID) {
                    return $doc;
                }
            }
        }

        return '';
    }

    /**
     * Adds an edition to the index.
     * @param string $tableID
     * @param string|null $id , null if the adding is not part of an updating process
     * @return void
     */
    private function addItemToEditionsIndex(string $tableID, string $id = null): void
    {

        // get collationTableManager
        $ctm = $this->getSystemManager()->getCollationTableManager();

        try {
            $edition = $this->getEditionData($ctm, $tableID);
        } catch (Exception) {
            print ("No edition in database with table id $tableID.\n");
            return;
        }

        // Clean data
        $edition = $this->cleanEditionData([$edition])[0];

        // Index editions
        $editionExists = false;

        if ($edition['table_id'] === (int)$tableID) {
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
     * Returns information about a transcription in the sql database.
     * @param string $pageID
     * @param string $col
     * @return array
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function getTranscriptionInfoFromDatabase(string $pageID, string $col): array
    {

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
        $transcriber = $this->getTranscriber($doc_id, $page, $col);
        $transcription = $this->getTranscription($doc_id, $page, $col);
        $lang = $this->getLang($pageID);

        // Get timestamp
        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();
        $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($pageID, $col);
        $currentVersionInfo = (array)(end($versionsInfo));
        $timeFrom = (string)$currentVersionInfo['timeFrom'];

        if ($timeFrom === '') {
            print("\nNo transcription in database with page id $pageID and column number $col.\n");
            return [];
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
    private function getEditionInfoFromDatabase(string $tableID): array
    {

        // get collationTableManager
        $ctm = $this->getSystemManager()->getCollationTableManager();

        try {
            $edition = $this->getEditionData($ctm, $tableID);
        } catch (Exception) {
            print ("\nNo edition in database with table id $tableID.\n");
            return [];
        }

        // clean data
        $edition = $this->cleanEditionData([$edition])[0];

        // index editions
        $editionExists = false;

        $data = [];
        if ($edition['table_id'] === (int)$tableID) {
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

        print ("Checking...");

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

        foreach ($docs as $doc) {

            // get a list of transcribed pages of the document
            $pages_transcribed = $this->getSystemManager()->getTranscriptionManager()->getTranscribedPageListByDocId($doc);

            foreach ($pages_transcribed as $page) {

                $page_id = $this->getPageID($doc, $page);
                $page_info = $this->getSystemManager()->getDocumentManager()->getPageInfo($page_id);
                $num_cols = $page_info->numCols;

                for ($col = 1; $col <= $num_cols; $col++) {

                    // $versions = $this->getDm()->getTranscriptionVersionsWithAuthorInfo($page_id, $col);
                    $versions = $versionManager->getColumnVersionInfoByPageCol($page_id, $col);
                    if (count($versions) === 0) {
                        // no transcription in this column
                        continue;
                    }

                    // get timestamp
                    // $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($page_id, $col);
                    $currentVersionInfo = (array)(end($versions));
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
            if (!in_array($indexedItem, $dbData) and !in_array(array_slice($indexedItem, 0, 2), $notUpdatedItems)) {
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

        return ['notIndexed' => $notIndexedItems, 'outdated' => $notUpdatedItems, 'numNotIndexedItems' => $numNotIndexedItems, 'numNotUpdatedItems' => $numNotUpdatedItems];
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

        $transcriptionInDatabase = $this->getTranscriptionInfoFromDatabase($pageID, $col);

        if ($transcriptionInDatabase === []) {
            return;
        }

        $transcriptionInIndex = $this->getIndexedItemInfo($pageID, $col);

        if ($transcriptionInIndex === []) {
            print("\nTranscription is NOT INDEXED!\n");

            if ($fix) {
                $this->addItem($pageID, $col);
            } else {
//                print ("Do you want to index it? (y/n)\n");
//                $input = rtrim(fgets(STDIN));

//                if ($input === 'y') {
                    $this->addItem($pageID, $col);
//                }
            }
        } else if ($transcriptionInIndex[0]['_source']['time_from'] === $transcriptionInDatabase['timeFrom']) {
            print("\nTranscription in index is up to date!\n");
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
     * Gets all data for editions from the sql database and from the open search index, then compares them and checks the completeness of the index.
     * If 'fix' is true, not indexed or outdated editions will be indexed or updated.
     * @param bool $fix
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function checkIndexEditions(bool $fix): void
    {

        // get collationTableManager
        $ctm = $this->getSystemManager()->getCollationTableManager();

        // get the data of up to 20 000 editions
        $editionsInDatabase = [];
        foreach (range(1, 20000) as $id) {
            try {
                $editionsInDatabase[] = $this->getEditionData($ctm, $id);
                print(".");
            } catch (Exception) {
                break;
            }
        }

        // clean data
        $editionsInDatabase = $this->cleanEditionData($editionsInDatabase);

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
        } else if ($editionInIndex[0]['_source']['timeFrom'] === $editionInDatabase['timeFrom']) {
            print("\nIndexed edition is up to date!\n");
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
     * Updates the target item if already indexed, otherwise adds it as a new item to the target index
     * @param string $arg1
     * @param string|null $arg2
     * @return void
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     */
    private function updateOrAddItem(string $arg1, string $arg2 = null): void
    {

        if (!$this->isAlreadyIndexed($arg1, $arg2)) {
            $this->addItem($arg1, $arg2);

        } else {

            print ("Updating...\n");

            $id = $this->getOpenSearchIDAndIndexName($arg1, $arg2)['id'];
            $this->removeItem($arg1, $arg2, 'update');
            $this->addItem($arg1, $arg2, $id, 'update');
        }

    }
}

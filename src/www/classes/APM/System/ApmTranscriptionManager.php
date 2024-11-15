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

namespace APM\System;

use APM\FullTranscription\ApmChunkMarkLocation;
use APM\FullTranscription\ApmChunkSegmentLocation;
use APM\FullTranscription\ApmColumnVersionManager;
use APM\FullTranscription\ApmDocManager;
use APM\FullTranscription\ApmItemLocation;
use APM\FullTranscription\ApmPageManager;
use APM\FullTranscription\ApmTranscriptionWitness;
use APM\FullTranscription\ColumnVersionInfo;
use APM\FullTranscription\ColumnVersionManager;
use APM\FullTranscription\DocManager;
use APM\FullTranscription\PageInfo;
use APM\FullTranscription\PageManager;
use APM\FullTranscription\TranscriptionManager;
use AverroesProject\ColumnElement\Element;
use AverroesProject\Data\EdNoteManager;
use AverroesProject\Data\MySqlHelper;
use AverroesProject\TxText\Item as ApItem;
use AverroesProjectToApm\DatabaseItemStream;
use Exception;
use RuntimeException;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\DataCache\CacheAware;
use ThomasInstitut\DataCache\DataCacheToolBox;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataCache\SimpleCacheAware;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\Profiler\CacheTracker;
use ThomasInstitut\Profiler\CacheTrackerAware;
use ThomasInstitut\Profiler\SimpleCacheTrackerAware;
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTracker;
use ThomasInstitut\TimeString\TimeString;
use InvalidArgumentException;
use PDO;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

class ApmTranscriptionManager extends TranscriptionManager
    implements SqlQueryCounterTrackerAware,
                CacheAware, CacheTrackerAware, ErrorReporter, LoggerAwareInterface, CodeDebugInterface
{

    use SimpleSqlQueryCounterTrackerAware {
        setSqlQueryCounterTracker as private localSetSqlQueryCounterTracker;
    }

    use SimpleCacheTrackerAware {
        setCacheTracker as private localSetCacheTracker;
    }
    use SimpleErrorReporterTrait;
    use LoggerAwareTrait;
    use CodeDebugWithLoggerTrait;
    use SimpleCacheAware;

    const ERROR_DOCUMENT_NOT_FOUND = 50;
    const ERROR_CACHE_ERROR = 51;
    const ERROR_NO_LOCATIONS = 52;

    const DEFAULT_CACHE_KEY_PREFIX = 'ApmTM-';


    const CACHE_TTL = 30 * 24 * 3600;  // 30 days

    /**
     * @var PDO
     */
    private PDO $dbConn;
    /**
     * @var MySqlDataTable
     */
    private MySqlDataTable $docsDataTable;
    /**
     * @var MySqlDataTable
     */
    private MySqlDataTable $pageTypesTable;
    /**
     * @var MySqlUnitemporalDataTable
     */
    private MySqlUnitemporalDataTable $pagesDataTable;
    /**
     * @var MySqlUnitemporalDataTable
     */
    private MySqlUnitemporalDataTable $elementsDataTable;
    /**
     * @var MySqlUnitemporalDataTable
     */
    private MySqlUnitemporalDataTable $itemsDataTable;
    /**
     * @var MySqlDataTable
     */
    private MySqlDataTable $worksTable;
    /**
     * @var MySqlDataTable
     */
    private MySqlDataTable $txVersionsTable;
    /**
     * @var MySqlHelper
     */
    private MySqlHelper $databaseHelper;
    /**
     * @var EdNoteManager
     */
    private EdNoteManager $edNoteManager;
    /**
     * @var array
     */
    private array $tNames;
    /**
     * @var ApmPageManager
     */
    private ApmPageManager $pageManager;
    /**
     * @var ApmColumnVersionManager
     */
    private ApmColumnVersionManager $columnVersionManager;
    /**
     * @var ApmDocManager
     */
    private ApmDocManager $docManager;

    /**
     * @var InMemoryDataCache
     */
    private InMemoryDataCache $localMemCache;
    /**
     * @var string
     */
    private string $cacheKeyPrefix;


    public function __construct(PDO $dbConn, array $tableNames, LoggerInterface $logger)
    {
        $this->resetError();
        $this->dbConn = $dbConn;
        $this->databaseHelper = new MySqlHelper($dbConn, $logger);
        $this->edNoteManager = new EdNoteManager($dbConn, $this->databaseHelper, $tableNames,
            $logger);
        $this->tNames  = $tableNames;


        $this->docsDataTable = new MySqlDataTable($this->dbConn,
            $tableNames[ApmMySqlTableName::TABLE_DOCS]);
        $this->docManager = new ApmDocManager($this->docsDataTable, $logger);
        $this->pageTypesTable = new MySqlDataTable($this->dbConn,
            $tableNames[ApmMySqlTableName::TABLE_PAGETYPES]);

        $pagesDataTable = new MySqlUnitemporalDataTable(
            $this->dbConn,
            $tableNames[ApmMySqlTableName::TABLE_PAGES]);
        $this->pageManager = new ApmPageManager($pagesDataTable, $logger);


        $this->elementsDataTable = new MySqlUnitemporalDataTable(
            $this->dbConn,
            $tableNames[ApmMySqlTableName::TABLE_ELEMENTS]);
        $this->itemsDataTable = new MySqlUnitemporalDataTable(
            $this->dbConn,
            $tableNames[ApmMySqlTableName::TABLE_ITEMS]);
        $this->worksTable = new MySqlDataTable($this->dbConn,
            $tableNames[ApmMySqlTableName::TABLE_WORKS]);


        $this->txVersionsTable = new MySqlDataTable($this->dbConn, $tableNames[ApmMySqlTableName::TABLE_VERSIONS_TX]);
        
        $this->columnVersionManager = new ApmColumnVersionManager($this->txVersionsTable);

        $this->dataCache = new InMemoryDataCache();
        $this->setCacheKeyPrefix( self::DEFAULT_CACHE_KEY_PREFIX);

        $this->localMemCache = new InMemoryDataCache();

        $this->setLogger($logger);
        $this->cacheOn = true;
    }


    public function setSqlQueryCounterTracker(SqlQueryCounterTracker $tracker): void
    {
        $this->localSetSqlQueryCounterTracker($tracker);
        $this->pageManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());
        $this->docManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());
    }

    public function setCacheTracker(CacheTracker $tracker): void
    {
        $this->localSetCacheTracker($tracker);
        // set trackers downstream here ...
    }

    public function setCacheKeyPrefix(string $prefix): void {
        $this->cacheKeyPrefix = $prefix;
    }

    private function getCacheKeyForWitness(string $workId, int $chunkNumber, int $docId, string $localWitnessId, string $timeStamp) : string {
        return  $this->cacheKeyPrefix . 'w-' . WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);
    }

    /**
     * @param string $workId
     * @param int $chunkNumber
     * @param int $docId
     * @param string $localWitnessId
     * @return string
     * @throws InvalidArgumentException
     */
    public function getLastChangeTimestampForWitness(string $workId, int $chunkNumber, int $docId, string $localWitnessId) : string {
        $chunkWitnesses = $this->getWitnessesForChunk($workId, $chunkNumber);
        $witnessFound = false;
        $timeStamp = '';
        foreach ($chunkWitnesses as $chunkWitnessInfo) {
            /** @var WitnessInfo $chunkWitnessInfo */
            $witnessDocId = $chunkWitnessInfo->typeSpecificInfo['docId'];
            $witnessLocalWitnessId = $chunkWitnessInfo->typeSpecificInfo['localWitnessId'];
            if ($witnessDocId === $docId && $witnessLocalWitnessId === $localWitnessId) {
                $witnessFound = true;
                $timeStamp = $chunkWitnessInfo->typeSpecificInfo['timeStamp'];
                break;
            }
        }
        if (!$witnessFound) {
            $this->setError( "Document $docId not found not found among witnesses for work $workId chunk $chunkNumber", self::ERROR_DOCUMENT_NOT_FOUND);
            throw new InvalidArgumentException($this->getErrorMessage(), $this->getErrorCode());
        }
        return $timeStamp;
    }


    /**
     * @param string $workId
     * @param int $chunkNumber
     * @param int $docId
     * @param string $localWitnessId
     * @param string $timeStamp
     * @return ApmTranscriptionWitness
     * @throws Exception
     */
    public function getTranscriptionWitness(string $workId, int $chunkNumber, int $docId, string $localWitnessId, string $timeStamp) : ApmTranscriptionWitness
    {

        $this->debugCode = false;

        if ($timeStamp === '') {
            $timeStamp = $this->getLastChangeTimestampForWitness($workId, $chunkNumber, $docId, $localWitnessId);
        }

        if ($this->cacheOn) {
            // first, check if it's in the cache
            $cacheKey = $this->getCacheKeyForWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);
            $this->codeDebug("Getting witness from cache (key='$cacheKey')");
            $cacheValue = '';
            $inCache = true;
            try {
                $cacheValue = $this->dataCache->get($cacheKey);
            } catch (KeyNotInCacheException $e) {
                $inCache = false;
            }

            if ($inCache) {
                // cache hit!
                $this->cacheTracker->incrementHits();
                $txWitness = DataCacheToolBox::fromCachedString($cacheValue, true);
                if ($txWitness === false) {
                    throw new RuntimeException('Error un-serializing from witness cache');
                }
                return $txWitness;
            }
            // cache miss
            $this->codeDebug('Not in cache');
            $this->cacheTracker->incrementMisses();
        }


        $locations = $this->getSegmentLocationsForFullTxWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);

        if (count($locations) === 0) {
            $this->setError( "No locations found for $workId-$chunkNumber, doc $docId - $localWitnessId", self::ERROR_NO_LOCATIONS);
            throw new InvalidArgumentException($this->getErrorMessage(), $this->getErrorCode());
        }
        $this->codeDebug(count($locations) . " locations");
        $apStreams = [];
        $itemIds = [];
        try {
            $docInfo = $this->getDocManager()->getDocInfoById($docId);
        } catch(InvalidArgumentException $e) {
            // no such document!
            $this->setError( "Document $docId not found", self::ERROR_DOCUMENT_NOT_FOUND);
            throw new InvalidArgumentException($this->getErrorMessage(), $this->getErrorCode());
        }

        // make sure segments are processed in the right order
        $segmentNumbers = array_keys($locations);
        sort($segmentNumbers);

        foreach($segmentNumbers as $segmentNumber) {
            $segLocation = $locations[$segmentNumber];
            /** @var ApmChunkSegmentLocation $segLocation */
            $this->codeDebug(sprintf("Processing segment Number %d, %d -> %d",
                $segmentNumber,$this->calcSeqNumber($segLocation->start), $this->calcSeqNumber($segLocation->end) ));
            if ($segLocation->isValid()) {
                $apItemStream = $this->getItemStreamForSegmentLocation($segLocation, $timeStamp);
                foreach($apItemStream as $row) {
                    $itemIds[] = (int) $row['id'];
                }
                $this->codeDebug(sprintf("Adding %d items to itemStream", count($apItemStream)));
                $apStreams[] = $apItemStream;
                $this->codeDebug(sprintf("Total stream has now  %d items", count($apStreams)));
            }
        }

        $edNoteArrayFromDb =  $this->edNoteManager->rawGetEditorialNotesForListOfItems($itemIds);
        $itemStream = new DatabaseItemStream($docId, $apStreams, $docInfo->languageCode, $edNoteArrayFromDb);

        $txWitness = new ApmTranscriptionWitness($docId, $workId, $chunkNumber, $localWitnessId, $timeStamp, $itemStream);
        /** @var ApmChunkSegmentLocation $firstLocation */
        $firstLocation = $locations[array_keys($locations)[0]];
        $firstPageId = $firstLocation->start->pageId;
        $firstColumn = $firstLocation->start->columnNumber;
        $firstLineNumber = $this->getInitialLineNumberForStartLocation( $firstLocation, $timeStamp);
        $this->logger->debug('First Line number: ' . $firstLineNumber);
        $txWitness->setInitialLineNumberForTextBox($firstPageId, $firstColumn, $firstLineNumber);

        if ($this->cacheOn) {
            $dataToSave = DataCacheToolBox::toStringToCache($txWitness, true);
            try {
                $this->dataCache->set($cacheKey, $dataToSave,self::CACHE_TTL);
            } catch(Exception $e) {
                $this->setError( "Cannot set cache for key $cacheKey : " . $e->getMessage(), self::ERROR_CACHE_ERROR);
                throw $e;
            }

            $this->cacheTracker->incrementCreate();
        }

        return $txWitness;
    }

    private function calcSeqNumber(ApmChunkMarkLocation $loc): int
    {
        return $this->calcSeqNumberGeneric($loc->pageSequence, $loc->columnNumber, $loc->elementSequence, $loc->itemSequence);
    }

    private function calcSeqNumberGeneric(int $pageSeq, int $colNumber, int $elementSeq, int $itemSeq) : int {
        return $pageSeq*1000000 + $colNumber * 10000 + $elementSeq*100 + $itemSeq;
    }

    private function getInitialLineNumberForStartLocation(ApmChunkSegmentLocation $location, string $timeString) : int {
        $this->codeDebug("Getting initial line numbers for start location");
        $seqNumberStart = $this->calcSeqNumber($location->start);
        $seqNumberColumnStart = $this->calcSeqNumberGeneric($location->start->pageSequence, $location->start->columnNumber, 0 , 0);

        $rows = $this->getItemRowsBetweenSeqNumbers($seqNumberColumnStart, $seqNumberStart, $timeString, $location->start->docId);
        $this->codeDebug("Got " . count($rows) . " rows");
        $lineNumber = 1;
        foreach ($rows as $i => $row) {
            $this->codeDebug("Row $i", $row);
            if (intval($row['e.type']) === Element::LINE) {
                $nNewLines = isset($row['text']) ? substr_count($row['text'], "\n") : 0;
                $this->codeDebug("Got $nNewLines new lines in line element, index $i");
                $lineNumber +=  $nNewLines;

            } else {
                $this->codeDebug("Got element type " . $row['e.type'] );
            }
        }
        return $lineNumber;
    }

    private function getItemRowsBetweenSeqNumbers(int $seqNumberStart, int $seqNumberEnd, string $timeString, int $docId) : array {

        // TODO: Deal with line gaps, those will NOT appear in the results of the current query since they do not have items

        if ($seqNumberStart >= $seqNumberEnd) {
            return [];
        }
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];

        $this->getSqlQueryCounterTracker()->incrementSelect();

        $query = "SELECT $ti.id, $ti.type, $ti.seq, $ti.ce_id, $ti.lang, $ti.hand_id, $ti.text, $ti.alt_text, $ti.extra_info, $ti.length, $ti.target, " .
            "$te.type as 'e.type', $te.page_id, $te.column_number as col, $te.seq as 'e.seq', $te.hand_id as 'e.hand_id', $te.reference, $te.placement, " .
            "$tp.seq as 'p.seq', $tp.foliation" .
            " FROM $ti" .
            " JOIN ($te FORCE INDEX (page_id_2), $tp)" .
            " ON ($te.id=$ti.ce_id AND $tp.id=$te.page_id)" .
            " WHERE $tp.doc_id=" . $docId  .
            " AND $te.type=" . Element::LINE .    // just include line elements
            " AND ($tp.seq*1000000 + $te.column_number*10000 + $te.seq * 100 + $ti.seq) > $seqNumberStart" .
            " AND ($tp.seq*1000000 + $te.column_number*10000 + $te.seq * 100 + $ti.seq) < $seqNumberEnd" .
            " AND $ti.valid_from<='$timeString'" .
            " AND $te.valid_from<='$timeString'" .
            " AND $tp.valid_from<='$timeString'" .
            " AND $ti.valid_until>'$timeString'" .
            " AND $te.valid_until>'$timeString'" .
            " AND $tp.valid_until>'$timeString'" .
            " ORDER BY $tp.seq, $te.column_number, $te.seq, $ti.seq ASC";

        $r = $this->databaseHelper->query($query);

        $rows = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)) {
            $rows[] = $row;
        }

        return $rows;
    }

    private function getItemStreamForSegmentLocation(ApmChunkSegmentLocation $location, string $timeString) : array {
        $seqNumberStart = $this->calcSeqNumber($location->start);
        $seqNumberEnd = $this->calcSeqNumber($location->end);

        // get all rows between seq numbers
        $rows = $this->getItemRowsBetweenSeqNumbers($seqNumberStart, $seqNumberEnd, $timeString, $location->start->docId);

        // Process the rows filtering out all but main text rows and including additions items at the proper
        // places
        $items = [];
        $additionItemsAlreadyInOutput = [];
        foreach($rows as $inputRow) {
            $elementType = intval($inputRow['e.type']);
            $itemType = intval($inputRow['type']);
            $itemId = intval($inputRow['id']);
            if ($elementType === Element::LINE) {
                switch( $itemType) {
                    case ApItem::DELETION:
                    case ApItem::UNCLEAR:
                    case ApItem::MARGINAL_MARK:
                        // these 3 item types can be replaced by an addition, let's see if there's one
                        $items[] = $inputRow;
                        $additionItem  = $this->getAdditionItemWithGivenTarget($itemId, $timeString);
                        if ($additionItem) {
                            // found an addition item that replaces the item
                            // force the addition to be located in the same element as the item it replaces
                            $fieldsToCopy = ['e.type', 'page_id', 'col', 'e.seq', 'e.hand_id', 'reference', 'placement', 'p.seq', 'foliation'];
                            foreach ($fieldsToCopy as $field) {
                                $additionItem[$field] = $inputRow[$field];
                            }
                            $items[] = $additionItem;
                            $additionItemsAlreadyInOutput[] = intval($additionItem['id']);
                        } else {
                            // did not find an addition item, so, if there's an addition that replaces the current
                            // item, it may be an addition element
                            $additionElementId = $this->getAdditionElementIdWithGivenReference($itemId, $timeString);
                            if ($additionElementId) {
                                // found an addition element, just put its rows in the item list
                                $additionElementItemStream = $this->getItemStreamForElementId($additionElementId, $timeString);
                                foreach($additionElementItemStream as $additionItem) {
                                    $items[] = $additionItem;
                                }
                            }
                        }
                        break;

                    case ApItem::ADDITION:
                        // it could be that this addition item is already included in the item list
                        // because it replaced a mark, deletion or unclear item
                        if (!in_array($itemId, $additionItemsAlreadyInOutput)) {
                            // not in the list already, so add it
                            $items[] = $inputRow;
                        }
                        break;

                    default:
                        $items[] = $inputRow;
                }
                continue;
            }

//            // Eventually we need to deal with glosses
//            if (intval($inputRow['e.type']) === Element::GLOSS) {
//                $items[] = $inputRow;
//            }

        }
        return $items;
    }

    private function getAdditionItemWithGivenTarget(int $target, string $timeString) {
        $ti = $this->tNames['items'];

        $this->getSqlQueryCounterTracker()->incrementSelect();

        $query = "SELECT * from $ti WHERE type=" . ApItem::ADDITION .
            " AND target=$target " .
            " AND valid_from<='$timeString' " .
            " AND valid_until>'$timeString' " .
            " LIMIT 1";

        $r = $this->databaseHelper->query($query);

        return $r->fetch(PDO::FETCH_ASSOC);
    }

    private function getAdditionElementIdWithGivenReference(int $reference, string $timeString) {
        $te = $this->tNames['elements'];

        $query = "SELECT id from $te where type=" . Element::SUBSTITUTION .
            " AND reference=$reference" .
            " AND valid_from<='$timeString' " .
            " AND valid_until>'$timeString' " .
            " LIMIT 1";
        $r = $this->databaseHelper->query($query);
        $row = $r->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return (int) $row['id'];
        }
        return false;
    }

    private function getItemStreamForElementId(int $elementId, string $timeString): array
    {
        $ti = $this->tNames['items'];
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];

        $this->getSqlQueryCounterTracker()->incrementSelect();

        $query = "SELECT $ti.id, $ti.type, $ti.seq, $ti.ce_id, $ti.lang, $ti.hand_id, $ti.text, $ti.alt_text, $ti.extra_info, $ti.length, $ti.target, " .
            "$te.type as 'e.type', $te.page_id, $te.column_number as col, $te.seq as 'e.seq', $te.hand_id as 'e.hand_id', $te.reference, $te.placement, " .
            "$tp.seq as 'p.seq', $tp.foliation" .
            " FROM $ti" .
            " JOIN ($te FORCE INDEX (page_id_2), $tp)" .
            " ON ($te.id=$ti.ce_id AND $tp.id=$te.page_id)" .
            " WHERE $te.id=$elementId" .
            " AND $ti.valid_from<='$timeString'" .
            " AND $te.valid_from<='$timeString'" .
            " AND $tp.valid_from<='$timeString'" .
            " AND $ti.valid_until>'$timeString'" .
            " AND $te.valid_until>'$timeString'" .
            " AND $tp.valid_until>'$timeString'" .
            //" AND $tp.valid_until='" . TimeString::END_OF_TIMES . "'" .
            " ORDER BY $ti.seq ASC";

        $r = $this->databaseHelper->query($query);

        $rows = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)) {
            $rows[] = $row;
        }
        return $rows;
    }

    public function getPageInfoByDocSeq(int $docId, int $seq) : PageInfo {
        return $this->pageManager->getPageInfoByDocSeq($docId, $seq);
    }

    /**
     * @inheritDoc
     */
    public function getChunkLocationMapForDoc(int $docId, string $timeString): array
    {
        return $this->getChunkLocationMapFromDatabase([ 'doc_id' => '=' . $docId], $timeString);
    }

    /**
     * @inheritDoc
     */
    public function getChunkLocationMapForChunk(string $workId, int $chunkNumber, string $timeString): array
    {
        return $this->getChunkLocationMapFromDatabase([ 'work_id' => "='$workId'", 'chunk_number' => "=$chunkNumber"], $timeString);
    }

    public function getSegmentLocationsForFullTxWitness(string $workId, int $chunkNumber, int $docId, string $localWitnessId, string $timeString) : array
    {
        //$this->codeDebug('getSegmentLocations', [ $workId, $chunkNumber, $docId, $localWitnessId, $timeString]);
        $chunkLocationMap = $this->getChunkLocationMapFromDatabase(
            [
                'work_id' => "='$workId'",
                'doc_id' => "=$docId",
                'chunk_number' => "=$chunkNumber",
                'witness_local_id' => "='$localWitnessId'"

            ],
            $timeString);


        if (!isset($chunkLocationMap[$workId][$chunkNumber][$docId][$localWitnessId])) {
            //$this->codeDebug("No segment locations found");
            return [];
        }
        //$this->codeDebug("Segment locations for $workId-$chunkNumber, doc $docId, local witness Id $localWitnessId", $chunkLocationMap[$workId][$chunkNumber][$docId][$localWitnessId] );
        return $chunkLocationMap[$workId][$chunkNumber][$docId][$localWitnessId];
    }

    /**
     * Creates an chunk location map out of an array of chunk mark locations
     *
     *
     * @param ApmChunkMarkLocation[] $chunkMarkLocations
     * @return array
     */
    private function createChunkLocationMapFromChunkMarkLocations(array $chunkMarkLocations) : array {

        $chunkLocations = [];

        foreach ($chunkMarkLocations as $location) {
            //$this->codeDebug('Processing location', [ $location]);
            if (!isset($chunkLocations[$location->workId][$location->chunkNumber][$location->docId][$location->witnessLocalId][$location->segmentNumber])) {
                // Initialize the chunk segment location
                $segmentLocation = new ApmChunkSegmentLocation();
                if ($location->type === 'start') {
                    $segmentLocation->start = $location;
                } else {
                    $segmentLocation->end = $location;
                }
                $chunkLocations[$location->workId][$location->chunkNumber][$location->docId][$location->witnessLocalId][$location->segmentNumber] = $segmentLocation;
                continue;
            }
            /** @var ApmChunkSegmentLocation $segmentLocation */
            $segmentLocation = $chunkLocations[$location->workId][$location->chunkNumber][$location->docId][$location->witnessLocalId][$location->segmentNumber];
            if ($segmentLocation->getChunkError() === ApmChunkSegmentLocation::DUPLICATE_CHUNK_START_MARKS ||
                $segmentLocation->getChunkError() === ApmChunkSegmentLocation::DUPLICATE_CHUNK_END_MARKS) {
                // there's already a duplicate chunk mark error in the segment, skip the current location
                continue;
            }
            if ($location->type === 'start') {
                if ($segmentLocation->start->isZero()) {
                    // start location not set, set it now
                    $segmentLocation->start = $location;
                } else {
                    // start location already set, this means the current location is a duplicate start mark
                    $this->logger->debug('Duplicate chunk start mark found', [ $location]);
                    $segmentLocation->setDuplicateChunkMarkError(true);
                }
            } else {
                if ($segmentLocation->end->isZero()) {
                    // end location not set, set it now
                    $segmentLocation->end = $location;
                } else {
                    // end location already set, this means the current location is a duplicate end mark
                    $this->logger->debug('Duplicate chunk end mark found', [ $location]);
                    $segmentLocation->setDuplicateChunkMarkError(false);
                }
            }
        }

        return $chunkLocations;
    }


    private function getChunkLocationMapFromDatabase(array $conditions, string $timeString) : array
    {

//        $this->codeDebug('Getting chunk map from DB', [ $conditions, $timeString]);
        $ti = $this->tNames[ApmMySqlTableName::TABLE_ITEMS];
        $te = $this->tNames[ApmMySqlTableName::TABLE_ELEMENTS];
        $tp = $this->tNames[ApmMySqlTableName::TABLE_PAGES];

        if ($timeString === '') {
            $timeString = TimeString::now();
        }

        $conditionsSql = [];
        foreach($conditions as $field => $condition) {
            switch($field) {
                case 'work_id':
                    $conditionsSql[] = "$ti.text" . $condition;
                    break;
                case 'doc_id':
                    $conditionsSql[] = "$tp.doc_id" . $condition;
                    break;
                case 'chunk_number':
                    $conditionsSql[] = "$ti.target" . $condition;
                    break;
                case 'witness_local_id':
                    $conditionsSql[] = "$ti.extra_info" . $condition;
                    break;
                default:
                    throw new InvalidArgumentException('Unrecognized field in conditions: ' . $field);
            }
        }
        if (count($conditionsSql) !== 0) {
            $conditionsSqlString = ' AND ' . implode(' AND ', $conditionsSql);
        } else {
            $conditionsSqlString = '';
        }

        $this->getSqlQueryCounterTracker()->incrementSelect();


        $query = "SELECT $tp.doc_id as 'doc_id', $tp.seq as 'page_seq', $tp.id as 'page_id'," .
            " $te.column_number," .
            " $te.seq as 'e_seq'," .
            " $ti.seq as 'item_seq'," .
            " $ti.extra_info as 'witness_local_id'," .
            " $ti.alt_text as 'type'," .
            " $ti.text as 'work_id'," .
            " $ti.target as 'chunk_number'," .
            " $ti.length as 'segment_number'," .
            " $ti.valid_from as 'from'," .
            " $ti.valid_until as 'until'" .
            " FROM $tp" .
            " JOIN ($te, $ti)" .
            " ON ($te.id=$ti.ce_id AND $tp.id=$te.page_id)" .
            " WHERE $ti.type=" . ApItem::CHUNK_MARK .
            " $conditionsSqlString" .
            " AND $ti.valid_from<='$timeString'" .
            " AND $te.valid_from<='$timeString'" .
            " AND $tp.valid_from<='$timeString'" .
            " AND $ti.valid_until>'$timeString'" .
            " AND $te.valid_until>'$timeString'" .
            " AND $tp.valid_until>'$timeString'" .
            " ORDER BY $tp.seq, $te.column_number, $te.seq, $ti.seq ASC";

//        $this->codeDebug("SQL Query", [ $query]);
        $r = $this->databaseHelper->query($query);

        $chunkMarkLocations = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)) {
            $location = new ApmChunkMarkLocation();
            $location->docId = (int) $row['doc_id'];
            $location->workId = $row['work_id'];
            $location->witnessLocalId = $row['witness_local_id'];
            $location->chunkNumber = (int) $row['chunk_number'];
            if (is_null($row['segment_number'])) {
                $location->segmentNumber = 1;  // very old items in the db did not have a segment number!
            } else {
                $location->segmentNumber = intval($row['segment_number']);
            }
            $location->type = $row['type'];

            $location->pageSequence = (int) $row['page_seq'];
            $location->pageId = (int) $row['page_id'];
            $location->columnNumber = (int) $row['column_number'];
            $location->elementSequence = (int) $row['e_seq'];
            $location->itemSequence = (int) $row['item_seq'];
            $location->validFrom = $row['from'];
            $location->validUntil = $row['until'];
            $chunkMarkLocations[] = $location;
        }

//        $this->codeDebug('ChunkMark Locations', $chunkMarkLocations);

        return $this->createChunkLocationMapFromChunkMarkLocations($chunkMarkLocations);

    }

    /**
     * @inheritDoc
     */
    public function getTranscribedPageListByDocId(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER) : array
    {
        $te = $this->tNames[ApmMySqlTableName::TABLE_ELEMENTS];
        $tp = $this->tNames[ApmMySqlTableName::TABLE_PAGES];

        $orderby = 'page_number';
        if ($order === self::ORDER_BY_SEQ) {
            $orderby = 'seq';
        }

        $this->getSqlQueryCounterTracker()->incrementSelect();

        $query =  'SELECT DISTINCT p.`page_number` AS page_number FROM ' .
            $tp . ' AS p' .
            ' JOIN ' . $te . ' AS e ON p.id=e.page_id' .
            ' WHERE p.doc_id=' . $docId .
            " AND `e`.`valid_until`='9999-12-31 23:59:59.999999'" .
            " AND `p`.`valid_until`='9999-12-31 23:59:59.999999'" .
            " ORDER BY p.`$orderby`";
        $r = $this->databaseHelper->query($query);
        $pages = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            $pages[] = $row['page_number'];
        }
        return $pages;
    }


    public function getPageManager(): PageManager
    {
        return $this->pageManager;
    }

    public function getDocManager(): DocManager
    {
        return $this->docManager;
    }

    /**
     * @inheritDoc
     */
    public function getVersionsForLocation(ApmItemLocation $location, string $upToTimeString, int $n = 0): array
    {
        $pageInfo = $this->pageManager->getPageInfoByDocSeq($location->docId, $location->pageSequence);

        $versions = $this->columnVersionManager->getColumnVersionInfoByPageCol($pageInfo->pageId, $location->columnNumber);

        $filteredVersions = [];
        foreach($versions as $version) {
            /** @var $version ColumnVersionInfo */
            if (strcmp($version->timeUntil, $upToTimeString) <= 0 ){
                $filteredVersions[] = $version;
            }
        }
        if ($n > 0 && count($filteredVersions) >= $n) {
            return array_slice($filteredVersions, count($filteredVersions) - $n, $n);
        }

        return $filteredVersions;
    }

    /**
     * @inheritDoc
     */
    public function getVersionsForSegmentLocation(ApmChunkSegmentLocation $chunkSegmentLocation): array
    {
        if (!$chunkSegmentLocation->isValid()) {
            return [];
        }
        $docId = $chunkSegmentLocation->start->docId;

        $startPageSeq = $chunkSegmentLocation->start->pageSequence;
        $startColumn = $chunkSegmentLocation->start->columnNumber;


        $endPageSeq = $chunkSegmentLocation->end->pageSequence;
        $endColumn = $chunkSegmentLocation->end->columnNumber;

        $segmentVersions = [];
        $startPageInfo = $this->pageManager->getPageInfoByDocSeq($docId, $startPageSeq);
        if ($startPageSeq === $endPageSeq) {
            $segmentVersions[$startPageSeq] = [];
            for($col = $startColumn; $col <= $endColumn; $col++) {
                $segmentVersions[$startPageSeq][$col] = $this->columnVersionManager->getColumnVersionInfoByPageCol($startPageInfo->pageId, $col);
            }
            return $segmentVersions;
        }

        $segmentVersions[$startPageSeq] = [];
        for($col = $startColumn; $col <= $startPageInfo->numCols; $col++) {
            $segmentVersions[$startPageSeq][$col] = $this->columnVersionManager->getColumnVersionInfoByPageCol($startPageInfo->pageId, $col);
        }
        for ($seq = $startPageSeq+1; $seq < $endPageSeq; $seq++) {
            $pageInfo = $this->pageManager->getPageInfoByDocSeq($docId, $seq);
            for($col = 1; $col <= $pageInfo->numCols; $col++) {
                $segmentVersions[$seq][$col] = $this->columnVersionManager->getColumnVersionInfoByPageCol($pageInfo->pageId, $col);
            }
        }
        $endPageInfo = $this->pageManager->getPageInfoByDocSeq($docId, $endPageSeq);
        for($col = 1; $col <= $endPageInfo->numCols; $col++) {
            $segmentVersions[$endPageSeq][$col] = $this->columnVersionManager->getColumnVersionInfoByPageCol($endPageInfo->pageId, $col);
        }

        return $segmentVersions;
    }

    /**
     * @inheritDoc
     */
    public function getVersionsForChunkLocationMap(array $chunkLocationMap): array
    {
        $versionMap = [];
        foreach ($chunkLocationMap as $workId => $chunkNumberMap) {
            foreach($chunkNumberMap as $chunkNumber => $docMap) {
                foreach ($docMap as $docId => $localWitnessIdMap) {
                    foreach($localWitnessIdMap as $localWitnessId => $segmentMap) {
                        foreach($segmentMap as $segmentNumber => $segmentLocation) {
                            /** @var $segmentLocation ApmChunkSegmentLocation */
                            $versionMap[$workId][$chunkNumber][$docId][$localWitnessId][$segmentNumber] = $this->getVersionsForSegmentLocation($segmentLocation);
                        }
                    }
                }
            }
        }
        return $versionMap;
    }

    public function getLastChunkVersionFromVersionMap(array $versionMap) : array {
        $lastVersions = [];
        foreach ($versionMap as $workId => $chunkNumberMap) {
            foreach($chunkNumberMap as $chunkNumber => $docMap) {
                foreach ($docMap as $docId => $localWitnessIdMap) {
                    foreach ($localWitnessIdMap as $localWitnessId => $segmentMap) {
                        //$this->logger->debug("Processing version map: $workId-$chunkNumber, doc $docId");
                        $lastVersion = new ColumnVersionInfo();
                        foreach ($segmentMap as $segmentNumber => $pageArray) {
                            foreach ($pageArray as $pageSeq => $columnArray) {
                                foreach ($columnArray as $colNumber => $versionArray) {
                                    foreach ($versionArray as $versionInfo) {
                                        /** @var $versionInfo ColumnVersionInfo */
                                        if ($versionInfo->timeUntil === TimeString::END_OF_TIMES) {
                                            if ($versionInfo->timeFrom > $lastVersion->timeFrom) {
                                                $lastVersion = $versionInfo;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        $lastVersions[$workId][$chunkNumber][$docId][$localWitnessId] = $lastVersion;
                    }
                }
            }
        }
        return $lastVersions;
    }

    /**
     * @inheritDoc
     */
    public function getLastSavesForDoc(int $docId, int $numSaves): array
    {
        $tv = $this->tNames[ApmMySqlTableName::TABLE_VERSIONS_TX];
        $tp = $this->tNames[ApmMySqlTableName::TABLE_PAGES];
        $eot = TimeString::END_OF_TIMES;

        $this->getSqlQueryCounterTracker()->incrementSelect();

        $query = "SELECT `$tv`.* from `$tv` JOIN `$tp` ON ($tv.page_id=$tp.id) WHERE " .
            "$tp.doc_id=$docId " .
            " AND $tp.valid_until='$eot' ORDER BY $tv.time_from DESC LIMIT $numSaves";


        $queryResult = $this->databaseHelper->query($query);

        $versions = [];
        while ($row = $queryResult->fetch(PDO::FETCH_ASSOC)){
            $versions[] = ColumnVersionInfo::createFromDbRow($row);
        }
        return $versions;
    }

    /**
     * @inheritDoc
     */
    public function getWitnessesForChunk(string $workId, int $chunkNumber): array
    {

        //$this->codeDebug("Getting witnesses for chunk $workId-$chunkNumber");
        $localCacheKey = 'getW4C:' . $workId . '-' . $chunkNumber;
        $cacheMiss = false;
        try {
            $returnValue = unserialize($this->localMemCache->get($localCacheKey));
        } catch (KeyNotInCacheException $e) {
            $cacheMiss = true;
        }

        if (!$cacheMiss) {
            //$this->codeDebug("In local transcription manager cache with key $localCacheKey");
            return $returnValue;
        }
        //$this->codeDebug("Not in local transcription manager in cache");

        $chunkLocationMap = $this->getChunkLocationMapForChunk($workId, $chunkNumber, TimeString::now());
        $versionMap = $this->getVersionsForChunkLocationMap($chunkLocationMap);
        $lastVersions = $this->getLastChunkVersionFromVersionMap($versionMap);

        $docArray = isset($chunkLocationMap[$workId][$chunkNumber]) ? $chunkLocationMap[$workId][$chunkNumber] : [];
        $docManager = $this->getDocManager();
        $witnessInfoArray = [];

        foreach($docArray as $docId => $localWitnessIdArray) {
            foreach ($localWitnessIdArray as $localWitnessId => $segmentArray) {

                $docInfo = $docManager->getDocInfoById($docId);
                /** @var $lastVersion ColumnVersionInfo */
                $lastVersion = $lastVersions[$workId][$chunkNumber][$docId][$localWitnessId];

                $witnessInfo = new WitnessInfo();
                $witnessInfo->type = WitnessType::FULL_TRANSCRIPTION;
                $witnessInfo->workId = $workId;
                $witnessInfo->chunkNumber = $chunkNumber;
                $witnessInfo->languageCode = $docInfo->languageCode;
                $witnessInfo->systemId = WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, $localWitnessId, $lastVersion->timeFrom);

                $witnessInfo->typeSpecificInfo = [
                    'docId' => $docId,
                    'localWitnessId' => $localWitnessId,
                    'timeStamp' => $lastVersion->timeFrom,
                    'docInfo' => $docInfo,
                    'lastVersion' => $lastVersion,
                    'segments' => $segmentArray
                ];
                $isValid = true;
                $invalidErrorCode = 0;
                foreach ($segmentArray as $segment) {
                    /** @var $segment ApmChunkSegmentLocation */
                    if (!$segment->isValid()) {
                        $isValid = false;
                        $invalidErrorCode = $segment->getChunkError();
                        continue;
                    }
                }
                $witnessInfo->isValid = $isValid;
                $witnessInfo->errorCode = $invalidErrorCode;
                $witnessInfoArray[] = $witnessInfo;
            }
        }

        $this->localMemCache->set($localCacheKey, serialize($witnessInfoArray));
        return $witnessInfoArray;
    }

    /**
     * @inheritDoc
     */
    public function getFullChunkMap(string $timeString): array
    {

        $chunkLocationMap = $this->getChunkLocationMapFromDatabase([], $timeString);

        $versionMap = $this->getVersionsForChunkLocationMap($chunkLocationMap);
        return [
            'chunkLocationMap' => $chunkLocationMap,
            'versionMap' => $versionMap
        ];
    }

    /**
     * @inheritDoc
     */
    public function updatePageSettings(int $pageId, PageInfo $newSettings, int $userTid): void
    {


        // check current settings
        $currentSettings = $this->getPageManager()->getPageInfoById($pageId);
        //$this->codeDebug('Update page settings', [ 'newSettings' => $newSettings, 'currentSettings' => $currentSettings]);


        // if there are no changes, do nothing
        if (get_object_vars($newSettings) === get_object_vars($currentSettings)) {
            $this->logger->info("UpdatePageSettings with no changes, nothing done.");
            return;
        }

//        $this->logger->debug("Updating page settings", $newSettings->getDatabaseRow());
        // Update the database first
        $this->getPageManager()->updatePageSettings($pageId, $newSettings);

        // deal with changes in foliation for the time being

        if ($currentSettings->foliation !== $newSettings->foliation) {
            // add a new version to each column with transcription
            for($i = 1; $i <= $newSettings->numCols; $i++) {
                if ($this->hasTranscription($pageId, $i)) {
                    $this->codeDebug("Page $pageId, col $i, has transcription, adding new version");
                    $versionInfo = new ColumnVersionInfo();
                    $versionInfo->pageId = $pageId;
                    $versionInfo->column = $i;
                    $versionInfo->isReview = false;
                    $versionInfo->isMinor = true;
                    $versionInfo->authorTid = $userTid;
                    $versionInfo->description = 'New page foliation: ' . $newSettings->foliation;
                    $versionInfo->timeFrom = TimeString::now();
                    $this->codeDebug("VersionInfo", $versionInfo->getDatabaseRow());
                    $this->getColumnVersionManager()->registerNewColumnVersion($pageId, $i, $versionInfo);
                } else {
                    $this->codeDebug("Page $pageId, col $i, does NOT have transcription, nothing to do");
                }
            }

        }
    }

    private function hasTranscription(int $pageId, int $columnNumber): bool
    {
        return $this->getColumnVersionManager()->getColumnVersionInfoByPageCol($pageId, $columnNumber, 1) !== [];
    }

    public function getColumnVersionManager(): ColumnVersionManager
    {
        return $this->columnVersionManager;
    }
}
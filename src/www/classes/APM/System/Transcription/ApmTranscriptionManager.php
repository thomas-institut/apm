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

namespace APM\System\Transcription;

use APM\System\ApmMySqlTableName;
use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Document\PageInfo;
use APM\System\LegacyLangData;
use APM\System\Person\PersonManagerInterface;
use APM\System\Person\PersonNotFoundException;
use APM\System\WitnessInfo;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use APM\ToolBox\ArraySort;
use APM\ToolBox\MyersDiff;
use AverroesProject\ColumnElement\Custodes;
use AverroesProject\ColumnElement\Element;
use AverroesProject\ColumnElement\ElementArray;
use AverroesProject\ColumnElement\Gloss;
use AverroesProject\ColumnElement\Head;
use AverroesProject\ColumnElement\Line;
use AverroesProject\ColumnElement\LineGap;
use AverroesProject\ColumnElement\PageNumber;
use AverroesProject\ColumnElement\Substitution;
use AverroesProject\Data\EdNoteManager;
use AverroesProject\Data\MySqlHelper;
use AverroesProject\TxText\Abbreviation;
use AverroesProject\TxText\Addition;
use AverroesProject\TxText\BoldText;
use AverroesProject\TxText\ChapterMark;
use AverroesProject\TxText\CharacterGap;
use AverroesProject\TxText\ChunkMark;
use AverroesProject\TxText\Deletion;
use AverroesProject\TxText\Gliph;
use AverroesProject\TxText\Heading;
use AverroesProject\TxText\Illegible;
use AverroesProject\TxText\Initial;
use AverroesProject\TxText\Item;
use AverroesProject\TxText\Item as ApItem;
use AverroesProject\TxText\ItemArray;
use AverroesProject\TxText\MarginalMark;
use AverroesProject\TxText\Mark;
use AverroesProject\TxText\MathText;
use AverroesProject\TxText\NoWordBreak;
use AverroesProject\TxText\ParagraphMark;
use AverroesProject\TxText\Rubric;
use AverroesProject\TxText\Sic;
use AverroesProject\TxText\Text;
use AverroesProject\TxText\Unclear;
use AverroesProjectToApm\DatabaseItemStream;
use Exception;
use InvalidArgumentException;
use PDO;
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\DataCache\CacheAware;
use ThomasInstitut\DataCache\DataCacheToolBox;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataCache\SimpleCacheAware;
use ThomasInstitut\DataTable\InvalidRowUpdateTime;
use ThomasInstitut\DataTable\InvalidTimeStringException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\DataTable\RowDoesNotExist;
use ThomasInstitut\TimeString\TimeString;

class ApmTranscriptionManager extends TranscriptionManager
    implements CacheAware, CodeDebugInterface
{
    use SimpleCacheAware;
    use CodeDebugWithLoggerTrait;

    const ERROR_DOCUMENT_NOT_FOUND = 50;
    const ERROR_CACHE_ERROR = 51;
    const ERROR_NO_LOCATIONS = 52;
    const DEFAULT_CACHE_KEY_PREFIX = 'ApmTM-';
    const CACHE_TTL = 30 * 24 * 3600;  // 30 days

    // Components that are generated when needed
    private ?PDO $dbConn = null;
    private ?MySqlHelper $databaseHelper = null;
    private ?EdNoteManager $edNoteManager = null;
    private ?ApmColumnVersionManager $columnVersionManager = null;
    private ?DocumentManager $docManager = null;
    private ?PersonManagerInterface $personManager = null;
    private ?MySqlUnitemporalDataTable $elementsDataTable = null;
    private ?MySqlUnitemporalDataTable $itemsDataTable = null;

    /**
     * @var callable
     */
    private $docManagerCallable;
    /**
     * @var callable
     */
    private $personManagerCallable;
    /**
     * @var callable
     */
    private $getDbConnCallable;
    private InMemoryDataCache $localMemCache;
    private string $cacheKeyPrefix;
    private array $tNames;

    /**
     * Language codes allowed in transcription
     * //TODO: use global configuration for this
     * @var string[]
     */
    private array $langCodes = [ 'ar', 'he', 'la', 'jrb'];

    public function __construct(callable $getDbConn,
                                array $tableNames,
                                LoggerInterface $logger,
                                callable $docManager,
                                callable $personManager
    )
    {
        $this->resetError();
        $this->getDbConnCallable = $getDbConn;
        $this->docManagerCallable = $docManager;
        $this->personManagerCallable = $personManager;
        $this->tNames  = $tableNames;
        $this->dataCache = new InMemoryDataCache();
        $this->setCacheKeyPrefix( self::DEFAULT_CACHE_KEY_PREFIX);
        $this->localMemCache = new InMemoryDataCache();
        $this->setLogger($logger);
        $this->cacheOn = true;
        $this->startCodeDebug();
    }

    private function getDbConn() : PDO {
        if ($this->dbConn === null) {
            $this->dbConn = call_user_func($this->getDbConnCallable);
        }
        return $this->dbConn;
    }

    private function getDatabaseHelper() : MySqlHelper {
        if ($this->databaseHelper === null) {
            $this->databaseHelper = new MySqlHelper($this->getDbConn(), $this->logger);
        }
        return $this->databaseHelper;
    }

    public function getEdNoteManager() : EdNoteManager {
        if ($this->edNoteManager === null) {
            $this->edNoteManager = new EdNoteManager($this->getDbConn(), $this->getDatabaseHelper(), $this->tNames,
                $this->logger);
        }
        return $this->edNoteManager;
    }

    public function getElementsDataTable() : MySqlUnitemporalDataTable {
        if ($this->elementsDataTable === null) {
            $this->elementsDataTable = new MySqlUnitemporalDataTable(
                $this->getDbConn(),
                $this->tNames[ApmMySqlTableName::TABLE_ELEMENTS]);
        }
        return $this->elementsDataTable;
    }

    public function getItemsDataTable() : MySqlUnitemporalDataTable {
        if ($this->itemsDataTable === null) {
            $this->itemsDataTable = new MySqlUnitemporalDataTable(
                $this->getDbConn(),
                $this->tNames[ApmMySqlTableName::TABLE_ITEMS]);
        }
        return $this->itemsDataTable;
    }

    public function getColumnVersionManager() : ColumnVersionManager {
        if ($this->columnVersionManager === null) {
            $txVersionsTable = new MySqlDataTable($this->getDbConn(), $this->tNames[ApmMySqlTableName::TABLE_VERSIONS_TX]);
            $this->columnVersionManager = new ApmColumnVersionManager($txVersionsTable);
        }
        return $this->columnVersionManager;
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
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
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
            $this->setError( "Document $docId not found not found among witnesses for work $workId chunk $chunkNumber",
                self::ERROR_DOCUMENT_NOT_FOUND);
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
     * @param string $defaultLanguageCode
     * @return ApmTranscriptionWitness
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     */
    public function getTranscriptionWitness(string $workId, int $chunkNumber, int $docId,
                                            string $localWitnessId, string $timeStamp,
                                            string $defaultLanguageCode) : ApmTranscriptionWitness
    {
        $this->debugCode = false;
        $cacheKey = '';

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
            } catch (KeyNotInCacheException) {
                $inCache = false;
            }

            if ($inCache) {
                // cache hit!
                $txWitness = DataCacheToolBox::fromCachedString($cacheValue, true);
                if ($txWitness === false) {
                    throw new RuntimeException('Error un-serializing from witness cache');
                }
                return $txWitness;
            }
            // cache miss
            $this->codeDebug('Not in cache');
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
            $docInfo = $this->getDocumentManager()->getDocInfo($docId);
        } catch(DocumentNotFoundException) {
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
                $segmentNumber,$this->calcSeqNumber($segLocation->getStart()), $this->calcSeqNumber($segLocation->getEnd()) ));
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

        $edNoteArrayFromDb =  $this->getEdNoteManager()->rawGetEditorialNotesForListOfItems($itemIds);
        $itemStream = new DatabaseItemStream($docId, $apStreams, LegacyLangData::getLangCode($docInfo->language), $edNoteArrayFromDb);

        $txWitness = new ApmTranscriptionWitness($docId, $workId, $chunkNumber, $localWitnessId, $timeStamp, $itemStream);
        /** @var ApmChunkSegmentLocation $firstLocation */
        $firstLocation = $locations[array_keys($locations)[0]];
        $firstPageId = $firstLocation->getStart()->pageId;
        $firstColumn = $firstLocation->getStart()->columnNumber;
        $firstLineNumber = $this->getInitialLineNumberForStartLocation( $firstLocation, $timeStamp);
        $this->logger->debug('First Line number: ' . $firstLineNumber);
        $txWitness->setInitialLineNumberForTextBox($firstPageId, $firstColumn, $firstLineNumber);

        if ($this->cacheOn) {
            $dataToSave = DataCacheToolBox::toStringToCache($txWitness, true);
            try {
                $this->dataCache->set($cacheKey, $dataToSave,self::CACHE_TTL);
            } catch(Exception $e) {
                $this->setError("Cannot set cache for key $cacheKey : " . $e->getMessage(), self::ERROR_CACHE_ERROR);
                throw new RuntimeException('Cannot set cache for key ' . $cacheKey);
            }
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
        $seqNumberStart = $this->calcSeqNumber($location->getStart());
        $seqNumberColumnStart = $this->calcSeqNumberGeneric($location->getStart()->pageSequence, $location->getStart()->columnNumber, 0 , 0);

        $rows = $this->getItemRowsBetweenSeqNumbers($seqNumberColumnStart, $seqNumberStart, $timeString, $location->getStart()->docId);
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

        $r = $this->getDatabaseHelper()->query($query);
        $rows = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)) {
            $rows[] = $row;
        }
        return $rows;
    }

    private function getItemStreamForSegmentLocation(ApmChunkSegmentLocation $location, string $timeString) : array {
        $seqNumberStart = $this->calcSeqNumber($location->getStart());
        $seqNumberEnd = $this->calcSeqNumber($location->getEnd());

        // get all rows between seq numbers
        $rows = $this->getItemRowsBetweenSeqNumbers($seqNumberStart, $seqNumberEnd, $timeString, $location->getStart()->docId);

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

            }
        }
        return $items;
    }

    private function getAdditionItemWithGivenTarget(int $target, string $timeString) {
        $ti = $this->tNames['items'];


        $query = "SELECT * from $ti WHERE type=" . ApItem::ADDITION .
            " AND target=$target " .
            " AND valid_from<='$timeString' " .
            " AND valid_until>'$timeString' " .
            " LIMIT 1";

        $r = $this->getDatabaseHelper()->query($query);

        return $r->fetch(PDO::FETCH_ASSOC);
    }

    private function getAdditionElementIdWithGivenReference(int $reference, string $timeString): bool|int
    {
        $te = $this->tNames['elements'];

        $query = "SELECT id from $te where type=" . Element::SUBSTITUTION .
            " AND reference=$reference" .
            " AND valid_from<='$timeString' " .
            " AND valid_until>'$timeString' " .
            " LIMIT 1";
        $r = $this->getDatabaseHelper()->query($query);
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

        $r = $this->getDatabaseHelper()->query($query);

        $rows = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)) {
            $rows[] = $row;
        }
        return $rows;
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
        $this->startCodeDebug();
        $this->codeDebug('getSegmentLocations', [ $workId, $chunkNumber, $docId, $localWitnessId, $timeString]);
        $chunkLocationMap = $this->getChunkLocationMapFromDatabase(
            [
                'work_id' => "='$workId'",
                'doc_id' => "=$docId",
                'chunk_number' => "=$chunkNumber",
                'witness_local_id' => "='$localWitnessId'"

            ],
            $timeString);


        if (!isset($chunkLocationMap[$workId][$chunkNumber][$docId][$localWitnessId])) {
            $this->codeDebug("No segment locations found");
            return [];
        }
        $this->codeDebug("Segment locations for $workId-$chunkNumber, doc $docId, local witness Id $localWitnessId", $chunkLocationMap[$workId][$chunkNumber][$docId][$localWitnessId] );
        $this->stopCodeDebug();
        return $chunkLocationMap[$workId][$chunkNumber][$docId][$localWitnessId];
    }

    /**
     * Creates a chunk location map out of an array of chunk mark locations
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
                    $segmentLocation->setStart($location);
                } else {
                    $segmentLocation->setEnd($location);
                }
                $chunkLocations[$location->workId][$location->chunkNumber][$location->docId][$location->witnessLocalId][$location->segmentNumber] = $segmentLocation;
                continue;
            }
            /** @var ApmChunkSegmentLocation $segmentLocation */
            $segmentLocation = $chunkLocations[$location->workId][$location->chunkNumber][$location->docId][$location->witnessLocalId][$location->segmentNumber];
            if ($segmentLocation->getStatus() === ChunkSegmentLocationStatus::DUPLICATE_CHUNK_START_MARKS ||
                $segmentLocation->getStatus() === ChunkSegmentLocationStatus::DUPLICATE_CHUNK_END_MARKS) {
                // there's already a duplicate chunk mark error in the segment, skip the current location
                continue;
            }
            if ($location->type === 'start') {
                if ($segmentLocation->getStart()->hasNotBeenSet()) {
                    // start location not set, set it now
                    $segmentLocation->setStart($location);
                } else {
                    // start location already set, this means the current location is a duplicate start mark
                    $this->logger->debug('Duplicate chunk start mark found', [ $location]);
                    $segmentLocation->setDuplicateChunkMarkStatus(true);
                }
            } else {
                if ($segmentLocation->getEnd()->hasNotBeenSet()) {
                    // end location not set, set it now
                    $segmentLocation->setEnd($location);
                } else {
                    // end location already set, this means the current location is a duplicate end mark
                    $this->logger->debug('Duplicate chunk end mark found', [ $location]);
                    $segmentLocation->setDuplicateChunkMarkStatus(false);
                }
            }
        }

        return $chunkLocations;
    }


    private function getChunkLocationMapFromDatabase(array $conditions, string $timeString) : array
    {

        $this->codeDebug('Getting chunk map from DB', [ $conditions, $timeString]);
        $ti = $this->tNames[ApmMySqlTableName::TABLE_ITEMS];
        $te = $this->tNames[ApmMySqlTableName::TABLE_ELEMENTS];
        $tp = $this->tNames[ApmMySqlTableName::TABLE_PAGES];

        if ($timeString === '') {
            $timeString = TimeString::now();
        }

        $conditionsSql = [];
        foreach($conditions as $field => $condition) {
            $conditionsSql[] = match ($field) {
                'work_id' => "$ti.text" . $condition,
                'doc_id' => "$tp.doc_id" . $condition,
                'chunk_number' => "$ti.target" . $condition,
                'witness_local_id' => "$ti.extra_info" . $condition,
                default => throw new InvalidArgumentException('Unrecognized field in conditions: ' . $field),
            };
        }
        if (count($conditionsSql) !== 0) {
            $conditionsSqlString = ' AND ' . implode(' AND ', $conditionsSql);
        } else {
            $conditionsSqlString = '';
        }



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

        $r = $this->getDatabaseHelper()->query($query);

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

        $orderBy = 'page_number';
        if ($order === self::ORDER_BY_SEQ) {
            $orderBy = 'seq';
        }

        $dbDocId = $this->getDocumentManager()->getLegacyDocId($docId);

        $this->logger->debug("Doc Id $docId, DB docId $dbDocId");


        $query = 'SELECT DISTINCT p.`page_number` AS page_number FROM ' .
            $tp . ' AS p' .
            ' JOIN ' . $te . ' AS e ON p.id=e.page_id' .
            ' WHERE p.doc_id=' . $dbDocId .
            " AND `e`.`valid_until`='9999-12-31 23:59:59.999999'" .
            " AND `p`.`valid_until`='9999-12-31 23:59:59.999999'" .
            " ORDER BY p.`$orderBy`";
        $r = $this->getDatabaseHelper()->query($query);
        $pages = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            $pages[] = intval($row['page_number']);
        }
        $this->logger->debug("Pages", [ 'pages' => $pages]);
        return $pages;
    }

    public function getDocumentManager(): DocumentManager
    {
        if ($this->docManager === null) {
            if ($this->docManagerCallable === null) {
                throw new RuntimeException("Document manager cannot be created, no callable given");
            }
            $this->docManager = call_user_func($this->docManagerCallable);
        }
        return $this->docManager;
    }

    private function getPersonManager() : PersonManagerInterface {
        if ($this->personManager === null) {
            if ($this->personManagerCallable === null) {
                throw new RuntimeException("Person manager cannot be created, no callable given");
            }
            $this->personManager = call_user_func($this->personManagerCallable);
        }
        return $this->personManager;
    }

    /**
     * @inheritDoc
     */
    public function getVersionsForLocation(ApmItemLocation $location, string $upToTimeString, int $n = 0): array
    {


        $pageInfo = $this->getPageInfoByDocSeq($location->docId, $location->pageSequence);

        $versions = $this->getColumnVersionManager()->getColumnVersionInfoByPageCol($pageInfo->pageId, $location->columnNumber);

        $filteredVersions = [];
        foreach($versions as $version) {
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
        $docId = $chunkSegmentLocation->getStart()->docId;



        $startPageSeq = $chunkSegmentLocation->getStart()->pageSequence;
        $startColumn = $chunkSegmentLocation->getStart()->columnNumber;


        $endPageSeq = $chunkSegmentLocation->getEnd()->pageSequence;
        $endColumn = $chunkSegmentLocation->getEnd()->columnNumber;

        $segmentVersions = [];
        try {
            $startPageInfo = $this->getPageInfoByDocSeq($docId, $startPageSeq);
        } catch (DocumentNotFoundException|PageNotFoundException) {
            return [];
        }

         $this->logger->debug("Start segment location for doc  $docId, page $startPageInfo->pageId");


        $segmentVersions[$startPageSeq] = [];
        if ($startPageSeq === $endPageSeq) {
            for($col = $startColumn; $col <= $endColumn; $col++) {
                $segmentVersions[$startPageSeq][$col] = $this->getColumnVersionManager()->getColumnVersionInfoByPageCol($startPageInfo->pageId, $col);
            }
            return $segmentVersions;
        }

        for($col = $startColumn; $col <= $startPageInfo->numCols; $col++) {
            $segmentVersions[$startPageSeq][$col] = $this->getColumnVersionManager()->getColumnVersionInfoByPageCol($startPageInfo->pageId, $col);
        }
        for ($seq = $startPageSeq+1; $seq < $endPageSeq; $seq++) {
            try {
                $pageInfo = $this->getPageInfoByDocSeq($docId, $seq);
            } catch (DocumentNotFoundException|PageNotFoundException) {
                // TODO: check this
                return [];
            }
            for($col = 1; $col <= $pageInfo->numCols; $col++) {
                $segmentVersions[$seq][$col] = $this->getColumnVersionManager()->getColumnVersionInfoByPageCol($pageInfo->pageId, $col);
            }
        }
        try {
            $endPageInfo = $this->getPageInfoByDocSeq($docId, $endPageSeq);
        } catch (DocumentNotFoundException|PageNotFoundException) {
            return [];
        }
        $this->logger->debug("End segment location for doc  $docId, page $endPageInfo->pageId");
        for($col = 1; $col <= $endPageInfo->numCols; $col++) {
            $segmentVersions[$endPageSeq][$col] = $this->getColumnVersionManager()->getColumnVersionInfoByPageCol($endPageInfo->pageId, $col);
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
                            $docId === 116 && $this->logger->debug("Chunk segment location",
                                [
                                    'valid' => $segmentLocation->isValid(),
                                    'status' => $segmentLocation->getStatus(),
                                    'start' => get_object_vars($segmentLocation->getStart()),
                                    'end' => get_object_vars($segmentLocation->getEnd()),

                                ]);
                            $versionMap[$workId][$chunkNumber][$docId][$localWitnessId][$segmentNumber] = $this->getVersionsForSegmentLocation($segmentLocation);
                            $docId === 116 && $this->logger->debug("Versions $workId-$chunkNumber doc $docId seg $segmentNumber", [ 'v' =>  $versionMap[$workId][$chunkNumber][$docId][$localWitnessId][$segmentNumber]]);
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
                        $this->logger->debug("Processing version map: $workId-$chunkNumber, doc $docId", [ 'segmentMap' => $segmentMap]);
                        $lastVersion = new ColumnVersionInfo();
                        foreach ($segmentMap as $pageArray) {
                            foreach ($pageArray as $columnArray) {
                                foreach ($columnArray as $versionArray) {
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


        $query = "SELECT `$tv`.* from `$tv` JOIN `$tp` ON ($tv.page_id=$tp.id) WHERE " .
            "$tp.doc_id=$docId " .
            " AND $tp.valid_until='$eot' ORDER BY $tv.time_from DESC LIMIT $numSaves";


        $queryResult = $this->getDatabaseHelper()->query($query);

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
        try {
            return unserialize($this->localMemCache->get($localCacheKey));
        } catch (KeyNotInCacheException) {
            // not in cache, we just keep going with the construction of the witness
        }

        $chunkLocationMap = $this->getChunkLocationMapForChunk($workId, $chunkNumber, TimeString::now());
        $versionMap = $this->getVersionsForChunkLocationMap($chunkLocationMap);
        $lastVersions = $this->getLastChunkVersionFromVersionMap($versionMap);

        $docArray = $chunkLocationMap[$workId][$chunkNumber] ?? [];
        $docManager = $this->getDocumentManager();
        $witnessInfoArray = [];


        foreach($docArray as $docId => $localWitnessIdArray) {
            $debug = $docId === 116;
            foreach ($localWitnessIdArray as $localWitnessId => $segmentArray) {
                try {
                    $docInfo = $docManager->getDocInfo($docId);
                } catch (DocumentNotFoundException $e) {
                    // should never happen
                    throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
                }
                /** @var $lastVersion ColumnVersionInfo */
                $lastVersion = $lastVersions[$workId][$chunkNumber][$docId][$localWitnessId];

                $debug && $this->logger->debug("Last version", [ 'lastV' => $lastVersion]);

                $witnessInfo = new WitnessInfo();
                $witnessInfo->type = WitnessType::FULL_TRANSCRIPTION;
                $witnessInfo->workId = $workId;
                $witnessInfo->chunkNumber = $chunkNumber;
                $witnessInfo->language = $docInfo->language;
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
                        $invalidErrorCode = $segment->getStatus();
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

        try {
            $versionMap = $this->getVersionsForChunkLocationMap($chunkLocationMap);
        } catch (DocumentNotFoundException|PageNotFoundException $e) {
            // should never happen if the database is not corrupted
            throw new RuntimeException("Exception thrown while getting versions for chunk location map : " . $e->getMessage(),
                $e->getCode(), $e );
        }
        return [
            'chunkLocationMap' => $chunkLocationMap,
            'versionMap' => $versionMap
        ];
    }


    /**
     * Creates an array of Element objects from an array such
     * as the one created by the TranscriptionEditor
     * @param array $theArray
     * @return array
     */
    public static function createElementArrayFromArray(array $theArray): array
    {
        $elements = [];
        foreach($theArray as $elementArray) {
            $e = self::createElementObjectFromArray($elementArray);
            $e->items = [];
            foreach($elementArray['items'] as $itemArray) {
                $item = self::createItemObjectFromArray($itemArray);
                $e->items[] = $item;
            }
            $elements[] = $e;
        }
        return $elements;
    }

    public static function createElementObjectFromArray($theArray): Element
    {
        $fields = [
            'id' => 'id',
            'type'=> 'type',
            'page_id' => 'pageId',
            'column_number' => 'columnNumber',
            'seq' => 'seq',
            'lang' => 'lang',
            'editor_tid' => 'editorTid',
            'hand_id' => 'handId',
            'reference' => 'reference',
            'placement' => 'placement'
        ];
        return self::createElementObjectFromArbitraryRow($fields, $theArray);
    }

    public static function createItemObjectFromArray($theArray)  : Item
    {
        $fields = [
            'id' => 'id',
            'type'=> 'type',
            'ce_id' => 'columnElementId',
            'seq' => 'seq',
            'lang' => 'lang',
            'hand_id' => 'handId',
            'text' => 'theText',
            'alt_text' => 'altText',
            'extra_info' => 'extraInfo',
            'length' => 'length',
            'target' => 'target',
        ];
        return self::createItemObjectFromArbitraryRow($fields, $theArray);
    }


    /**
     * @inheritDoc
     */
    public function updatePageSettings(int $pageId, PageInfo $newSettings, int $userTid): void
    {
        $currentSettings = $this->getDocumentManager()->getPageInfo($pageId);
        $this->getDocumentManager()->updatePageSettings($pageId, $newSettings);
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

    /**
     * @param int $pageId
     * @param int $col
     * @param string $timeString
     * @return Element[]
     * @throws InvalidTimeStringException
     */
    public function getColumnElementsByPageId(int $pageId, int $col, string $timeString = ''): array
    {
        if ($timeString === '') {
            $timeString = TimeString::now();
        }
        $rows = $this->getElementsDataTable()->findRowsWithTime([
            'page_id' => $pageId,
            'column_number' => $col
        ], 0, $timeString);
        $theRows = iterator_to_array($rows);
        ArraySort::byKey($theRows, 'seq');
        $elements = [];
        foreach($theRows as $row) {
            $e = $this->createElementObjectFromRow($row);
            $e->items = $this->getItemsForElement($e, $timeString);
            $elements[] = $e;
        }
        return $elements;
    }

    public function updateColumnElements(int $pageId, int $columnNumber, array $newElements, string $time = ''): bool|array
    {
        $this->logger->debug("UPDATING COLUMN ELEMENTS, pageId=$pageId, col=$columnNumber");
        // force pageId and columnNumber in the elements in $newElements
        foreach ($newElements as $element ) {
            $element->pageId = $pageId;
            $element->columnNumber = $columnNumber;
        }

        try {
            $oldElements = $this->getColumnElementsByPageId($pageId, $columnNumber);
        } catch (InvalidTimeStringException $e) {
            // should never happen
            throw new RuntimeException('Invalid time string: ' . $e->getMessage());
        }
        $editScript = ElementArray::getEditScript(
            $oldElements,
            $newElements
        );

        if ($time === '') {
            $time = TimeString::now();
        }
        $newItemsIds = [];
        $newElementsIndex = 0;
        foreach ($editScript as $editInstruction) {
            list ($index, $cmd, $newSeq) = $editInstruction;
            switch ($cmd) {
                case MyersDiff::KEEP:
                    $this->logger->debug("KEEPING element @ pos " . $index . ", id=" . $oldElements[$index]->id);
                    if ($oldElements[$index]->seq
                        !== $newSeq) {
                        $this->logger->debug("... with new seq $newSeq");
                        $this->logger->debug("... seq was " . $oldElements[$index]->seq );
                        $newElements[$newElementsIndex]->seq =
                            $newSeq;
                    }
                    if ($oldElements[$index]->type === Element::SUBSTITUTION || $oldElements[$index]->type === Element::ADDITION) {
//                        $this->logger->debug("Keeping substitution/addition element");
                        if ($oldElements[$index]->reference !== 0) {
                            if (!isset($newItemsIds[$oldElements[$index]->reference])) {
                                $this->logger->warning('Found element without a valid target reference', get_object_vars($oldElements[$index]));
                            }
                            else {
                                if ($oldElements[$index]->reference !== $newItemsIds[$oldElements[$index]->reference]) {
                                    $newElements[$index]->reference = $newItemsIds[$oldElements[$index]->reference];
                                }
                            }
                        }
                    }
                    list (, $ids) = $this->updateElement($newElements[$newElementsIndex], $oldElements[$index], $newItemsIds, $time);
                    foreach($ids as $oldId => $newId) {
                        $newItemsIds[$oldId] = $newId;
                    }
                    $newElementsIndex++;
                    break;

                case MyersDiff::DELETE:
                    $this->logger->debug("DELETING element @ " . $index . ", id=" . $oldElements[$index]->id);
//                    $this->logger->debug("... .... time=" . $time);
                    $this->deleteElement($oldElements[$index]->id, $time);
                    break;

                case MyersDiff::INSERT:
                    $this->logger->debug("INSERTING element @ " . $index);
//                    $this->logger->debug("...New Seq: " . $newSeq);
                    $newElements[$newElementsIndex]->seq = $newSeq;
                    if ($newElements[$index]->type === Element::SUBSTITUTION || $newElements[$index]->type === Element::ADDITION) {
//                        $this->logger->debug("...Inserting substitution/addition element");
                        if ($newElements[$index]->reference !== 0) {
                            if (!isset($newItemsIds[$newElements[$index]->reference])) {
                                $this->logger->warning('Found element without a valid target reference', get_object_vars($newElements[$index]));
                            }
                            else {
                                if ($newElements[$index]->reference !== $newItemsIds[$newElements[$index]->reference]) {
                                    $this->logger->debug("... with new reference",
                                        [ 'oldRef' => $newElements[$index]->reference, 'newRef'=> $newItemsIds[$newElements[$index]->reference] ]);
                                    $newElements[$index]->reference = $newItemsIds[$newElements[$index]->reference];
                                }
                            }
                        } else {
                            // nothing to do really!
//                            $this->logger->debug("...with reference === 0");
                        }
                    }
//                    $this->logger->debug("... .... time=" . $time);
                    $element = $this->insertNewElement($newElements[$newElementsIndex], false, $newItemsIds, $time);
                    if ($element === false) {
                        $this->logger->error("Can't insert new element in DB", get_object_vars($newElements[$newElementsIndex]));
                        return false;
                    }
                    for ($j = 0; $j < count($newElements[$newElementsIndex]->items); $j++) {
                        $givenId = $newElements[$newElementsIndex]->items[$j]->id;
                        $newItemsIds[$givenId] = $element->items[$j]->id;
                    }
                    $this->logger->debug("...element id = " . $element->id);
                    $newElementsIndex++;
                    break;
            }
        }
        $this->logger->debug(":: finished UPDATING COLUMN ELEMENTS, pageId=$pageId, col=$columnNumber");
        return $newItemsIds;
    }

    /**
     * @param Element $element
     * @param string $time
     * @return int
     * @throws InvalidTimeStringException
     * @throws RowAlreadyExists
     */
    private function createNewElementInDB(Element $element, string $time = ''): int
    {
        if ($time === '') {
            $time = TimeString::now();
        }
        return $this->getElementsDataTable()->createRowWithTime([
            'type' => $element->type,
            'page_id' => $element->pageId,
            'column_number' => $element->columnNumber,
            'seq' => $element->seq,
            'lang' => $element->lang,
            'editor_tid' => $element->editorTid,
            'hand_id' => $element->handId,
            'reference' => $element->reference,
            'placement' => $element->placement
        ], $time);
    }

    /**
     * @param Element $element
     * @param bool|string $time
     * @return bool
     * @throws InvalidRowUpdateTime
     * @throws InvalidTimeStringException
     * @throws RowDoesNotExist
     */
    private function updateElementInDB(Element $element, bool|string $time = false): bool
    {
        if (!$time) {
            $time = TimeString::now();
        }

        $this->getElementsDataTable()->realUpdateRowWithTime([
            'id' => $element->id,
            'type' => $element->type,
            'page_id' => $element->pageId,
            'column_number' => $element->columnNumber,
            'seq' => $element->seq,
            'lang' => $element->lang,
            'editor_tid' => $element->editorTid,
            'hand_id' => $element->handId,
            'reference' => $element->reference,
            'placement' => $element->placement
        ], $time);
        return true;
    }

    /**
     * Creates a new element in the database.
     * Return the newly created element, which will be a copy of the
     * given element with system ids for itself and for its items.
     *
     * if $insertAtEnd is false, the given element's sequence will be
     * respected and the rest of the elements of the column will be
     * moved to accommodate the new element's position.
     *
     * @param Element $element
     * @param boolean $insertAtEnd
     * @param array $itemIds new Item Ids (so that addition targets can be set)
     * @param string $time
     * @return bool|Element
     * @throws InvalidRowUpdateTime
     * @throws InvalidTimeStringException
     * @throws RowAlreadyExists
     * @throws RowDoesNotExist
     */
    public function insertNewElement(Element $element, bool $insertAtEnd = true, array $itemIds = [], string $time = ''): bool|Element
    {
        if ($time === '') {
            $time = TimeString::now();
        }

        if ($element->pageId === -1) {
            $this->logger->error('Element being inserted in '
                . 'null page', ['pageId' => $element->pageId]);
            return false;
        }

        if ($element->columnNumber <= 0) {
            $this->logger->error('Element being inserted in '
                . 'column <= 0', ['pageId' => $element->pageId]);
            return false;
        }

        if ($element->type !== Element::LINE_GAP && count($element->items) === 0) {
            $this->logger->error('Empty element being inserted',
                [ 'pageId' => $element->pageId,
                    'colNum' => $element->columnNumber,
                    'editorTid' => $element->editorTid]);
            return false;
        }

        if (!in_array($element->lang, $this->langCodes)) {
            $this->logger->error('Element with invalid language being inserted',
                [   'pageId' => $element->pageId,
                    'colNum' => $element->columnNumber,
                    'editorTid' => $element->editorTid,
                    'lang' => $element->lang]);
            return false;
        }

        // Database checks
        try {
            $pageInfo = $this->getDocumentManager()->getPageInfo($element->pageId);
        } catch (PageNotFoundException) {
            $this->logger->error('Element being inserted in '
                . 'non-existent page', ['pageId' => $element->pageId]);
            return false;
        }



        if ($element->columnNumber > $pageInfo['num_cols']) {
            $this->logger->error('Element being inserted in '
                . 'non-existent colum',
                [' pageId' => $element->pageId,
                    'colNum' => $element->columnNumber]);
            return false;
        }

        try {
            $userData = $this->getPersonManager()->getPersonEssentialData($element->editorTid);
            $editorIsUser = $userData->isUser;
        } catch (PersonNotFoundException) {
            $editorIsUser = false;
        }



        if (!$editorIsUser) {
            $this->logger->error('Element being inserted by '
                . 'non-existent editor',
                ['pageId' => $element->pageId,
                    'colNum' => $element->columnNumber,
                    'editorTid' => $element->editorTid]);
            return false;
        }


        $maxSeq = $this->getMaxElementSeq($element->pageId,
            $element->columnNumber);
        if (!$insertAtEnd && $element->seq > $maxSeq) {
            // No holes in sequence, insert at end for higher than max
            // values
            $insertAtEnd = true;
        }
        // Now we have a good element
        $newElement = clone $element;
        if ($insertAtEnd) {
            // Simplest case, overwrite element's sequence
            $newElement->seq = $maxSeq+1;
        } else {
            // Need to reposition the rest of the elements in the column
            try {
                $pageInfo = $this->getDocumentManager()->getPageInfo($newElement->pageId);
            } catch (PageNotFoundException $e) {
                // should not happen!
                throw new RuntimeException("Element's page info not found: " . $e->getMessage());
            }
            $docId = $pageInfo['doc_id'];
            $pageNumber = $pageInfo['page_number'];
            $columnElements = $this->getColumnElements($docId,
                $pageNumber,
                $newElement->columnNumber);
            foreach ($columnElements as $cElement) {
                if ($cElement->seq >= $newElement->seq) {
                    $cElement->seq++;
                    $this->updateElementInDB($cElement, $time);
                }
            }
        }
        // Now just create the new element
        $newId = $this->createNewElementInDB($newElement, $time);
//        $this->logger->debug("New element Id = $newId, type = " . $newElement->type);
        if ($newId === 0) {
            // This means a database error, but it should generate an exception!
            // Can't reproduce in testing for now
            // @codeCoverageIgnoreStart
            $this->logger->error('Can\'t save new element in DB',
                ['pageId' => $element->pageId,
                    'seq' => $newElement->seq,
                    'colNum' => $element->columnNumber,
                    'editorTid' => $element->editorTid]);
            return false;
            // @codeCoverageIgnoreEnd
        }

        foreach ($newElement->items as $item) {
            $item->columnElementId = $newId;
            // Forcing hands right now, this should change in the future
            $item->handId = $newElement->handId;
            if ($item->lang == '') {
                $item->lang = $newElement->lang;
            }
            // Check for addition targets
            if ($item->type === Item::ADDITION && $item->target) {
                if (!isset($itemIds[$item->target])) {
                    $this->logger->warning("Creating an Addition item with target Id not yet defined", get_object_vars($item));
                }
//                $this->logger->debug("Setting addition target for new item: $item->target => " . $itemIds[$item->target]);
                $item->target = $itemIds[$item->target];
            }
            $newItemId = $this->createNewItemInDB($item, $time);
            if ($newItemId === -1 ) {
                // This means a database error
                // Can't reproduce in testing for now
                // @codeCoverageIgnoreStart
                $this->logger->error('Can\'t save new items in DB',
                    ['pageId' => $element->pageId,
                        'seq' => $newElement->seq,
                        'colNum' => $element->columnNumber,
                        'editorTid' => $element->editorTid,
                        'itemType' => $item->type,
                        'itemSeq' => $item->seq
                    ]);
                return false;
                // @codeCoverageIgnoreEnd
            }
            $itemIds[$item->id] = $newItemId;
        }
        return $this->getElementById($newId);
    }

    private function createNewItemInDB(Item $item, $time = false): int
    {

        if (!$time) {
            $time = TimeString::now();
        }
        try {
            $handId = $item->handId;
            if (!is_int($handId)) {
                $handId = 0;
            }
            return $this->getItemsDataTable()->createRowWithTime([
                'ce_id' => $item->columnElementId,
                'type' => $item->type,
                'seq' => $item->seq,
                'lang' => $item->lang,
                'hand_id' => $handId,
                'text' => $item->theText,
                'alt_text' => $item->altText,
                'extra_info' => $item->extraInfo,
                'length' => $item->length,
                'target' => $item->target
            ], $time);
        } catch (Exception $e) {
            $this->logger->error("Exception creating new item in DB: " . $e->getMessage());
            return -1;
        }
    }



    /**
     *
     * @param int $docId
     * @param int $page
     * @param int $col
     * @param string $time
     * @return Element[]
     * @throws InvalidTimeStringException
     */
    public function getColumnElements(int $docId, int $page, int $col, string $time = ''): array
    {
        if ($time === '') {
            $time = TimeString::now();
        }
        try {
            $pageId = $this->getDocumentManager()->getPageIdByDocPage($docId, $page);
        } catch (DocumentNotFoundException|PageNotFoundException) {
            return [];
        }
        return $this->getColumnElementsByPageId($pageId, $col, $time);
    }


    private function getMaxElementSeq(int $pageId, int $col): int
    {

        $te = $this->tNames['elements'];
        $sql = "SELECT MAX(seq) as m FROM $te "
            . "WHERE page_id=$pageId AND column_number=$col "
            . "AND `valid_until`='9999-12-31 23:59:59.999999'";
        $row = $this->getDatabaseHelper()->getOneRow($sql);
        if (isset($row['m'])) {
            return (int) $row['m'];
        }
        return -1;
    }


    /**
     * @param int $elementId
     * @param bool $timeString
     * @return bool
     * @throws Exception
     */
    public function deleteElement(int $elementId, bool|string $timeString=false): bool
    {

        // TODO: do all deletes within a transaction
        /**
         * Could there be a timing problem here? The deletes of element
         * and items will not have all the same valid_to value. There
         * might be problems if there's a query for elements for a time
         * right between those values (we're talking about 1/10th of a second
         * interval maybe)
         */

        if (!$timeString) {
            $timeString = TimeString::now();
        }
        $element = $this->getElementById($elementId);
        $this->getElementsDataTable()->deleteRowWithTime($element->id, $timeString);

        foreach ($element->items as $item) {
            $this->getItemsDataTable()->deleteRowWithTime($item->id, $timeString);
        }
        return true;
    }

    public function getElementById($elementId): bool|Element
    {
        $row = $this->getElementsDataTable()->getRow($elementId);
        if ($row === null) {
            return false;
        }
        $e = $this->createElementObjectFromRow($row);

        try {
            $e->items = $this->getItemsForElement($e);
        } catch (InvalidTimeStringException $e) {
            // should NEVER happen
            throw new RuntimeException($e->getMessage());
        }
        return $e;
    }

    /**
     * @throws InvalidTimeStringException
     */
    private function getItemsForElement($element, $time = false): array
    {
        if ($time === false) {
            $time = TimeString::now();
        }


        $rows = $this->getItemsDataTable()->findRowsWithTime([
            'ce_id' => $element->id
        ], 0, $time);

        $theRows = iterator_to_array($rows);
        ArraySort::byKey($theRows, 'seq');

        $tt=[];

        foreach ($theRows as $row) {
            $item = self::createItemObjectFromRow($row);
            ItemArray::addItem($tt, $item, true);
        }
        return $tt;
    }

    public static function createItemObjectFromRow($row) : Item
    {
        $fields = [
            'id' => 'id',
            'type'=> 'type',
            'ce_id' => 'ce_id',
            'seq' => 'seq',
            'lang' => 'lang',
            'hand_id' => 'hand_id',
            'text' => 'text',
            'alt_text' => 'alt_text',
            'extra_info' => 'extra_info',
            'length' => 'length',
            'target' => 'target',
        ];
        return self::createItemObjectFromArbitraryRow($fields, $row);
    }

    private function createElementObjectFromRow($row): Element
    {
        $fields = [
            'id' => 'id',
            'type'=> 'type',
            'page_id' => 'page_id',
            'column_number' => 'column_number',
            'seq' => 'seq',
            'lang' => 'lang',
            'editor_tid' => 'editor_tid',
            'hand_id' => 'hand_id',
            'reference' => 'reference',
            'placement' => 'placement'
        ];
        return self::createElementObjectFromArbitraryRow($fields, $row);
    }

    public static function createElementObjectFromArbitraryRow($fields, $row) : Element {

        switch ($row[$fields['type']]){
            case Element::LINE:
                $e = new Line();
                // the line number
                //$e->setLineNumber($row[$fields['reference']]);
                break;

            case Element::CUSTODES:
                $e = new Custodes();
                break;

            case Element::HEAD:
                $e = new Head();
                break;

            case Element::GLOSS:
                $e = new Gloss();
                break;

            case Element::LINE_GAP:
                $e = new LineGap();
                break;

            case Element::ADDITION:
                $e = new \AverroesProject\ColumnElement\Addition();
                break;

            case Element::PAGE_NUMBER:
                $e = new PageNumber();
                break;

            case Element::SUBSTITUTION:
                $e = new Substitution();
                break;
        }
        if (!isset($e)) {
            throw new RuntimeException("Unknown Element type in $row", $row);
        }
        $e->columnNumber = (int) $row[$fields['column_number']];
        $e->pageId = (int) $row[$fields['page_id']];
        $e->seq = (int) $row[$fields['seq']];
        $e->editorTid = intval($row[$fields['editor_tid']]);
        $e->handId = (int) $row[$fields['hand_id']];
        $e->id = (int) $row[$fields['id']];
        $e->lang = $row[$fields['lang']];
        $e->reference = (int) $row[$fields['reference']];
        $e->placement = $row[$fields['placement']];
        return $e;
    }


    public static function createItemObjectFromArbitraryRow($fields, $row) : Item{
        switch ($row[$fields['type']]){
            case Item::TEXT:
                $item = new Text($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']]);
                break;

            case Item::RUBRIC:
                $item = new Rubric($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']]);
                break;

            case Item::INITIAL:
                $item = new Initial($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']]);
                break;

            case Item::SIC:
                $item = new Sic($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']],
                    $row[$fields['alt_text']]);
                break;

            case Item::MARK:
                $item = new Mark($row[$fields['id']],
                    $row[$fields['seq']]);
                break;

            case Item::UNCLEAR:
                $item = new Unclear($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['extra_info']],
                    $row[$fields['text']],
                    $row[$fields['alt_text']]);
                break;

            case Item::ILLEGIBLE:
                $item = new Illegible($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['length']],
                    $row[$fields['extra_info']]);
                break;

            case Item::ABBREVIATION:
                $item = new Abbreviation($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']],
                    $row[$fields['alt_text']]);
                break;

            case Item::GLIPH:
                $item = new Gliph($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']]);
                break;

            case Item::DELETION:
                $item = new Deletion($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']],
                    $row[$fields['extra_info']]);
                break;

            case Item::ADDITION:
                $item = new Addition($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']],
                    $row[$fields['extra_info']],
                    (int) $row[$fields['target']]);
                break;

            case Item::NO_WORD_BREAK:
                $item = new NoWordBreak($row[$fields['id']],
                    $row[$fields['seq']]);
                break;

            case Item::CHUNK_MARK:
                if (!isset($row[$fields['length']])) {
                    $row[$fields['length']] = 1;
                }
                $item = new ChunkMark($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']],
                    (int) $row[$fields['target']],
                    $row[$fields['alt_text']],
                    $row[$fields['extra_info']],
                    $row[$fields['length']]);
                break;

            case Item::CHAPTER_MARK:
                $textFields = explode(ChapterMark::SEPARATOR, $row[$fields['text']]);
                $appellation = $textFields[0];
                $title = $textFields[1];
                $item = new ChapterMark(
                    $row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['extra_info']],
                    (int) $row[$fields['target']],
                    $row[$fields['alt_text']],
                    $appellation,
                    $title,
                    $row[$fields['length']]
                );
                break;

            case Item::CHARACTER_GAP:
                $item = new CharacterGap(
                    $row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['length']]);
                break;

            case Item::PARAGRAPH_MARK:
                $item = new ParagraphMark($row[$fields['id']],
                    $row[$fields['seq']]);
                break;

            case Item::MATH_TEXT:
                $item = new MathText($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']]);
                break;

            case Item::MARGINAL_MARK:
                $item = new MarginalMark($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']]);
                break;

            case Item::BOLD_TEXT:
                $item = new BoldText($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']]);
                break;

            case Item::HEADING:
                $item = new Heading($row[$fields['id']],
                    $row[$fields['seq']],
                    $row[$fields['text']]);


        }
        if (!isset($item)) {
            throw new RuntimeException("Unknown item type found in row", $row);
        }
        $item->lang = $row[$fields['lang']];
        $item->handId = $row[$fields['hand_id']];
        $item->setColumnElementId($row[$fields['ce_id']]);
        return $item;
    }


    /**
     * @inheritDoc
     */
    public function getDocIdsTranscribedByUser(int $userTid) : array
    {
        $tp = $this->tNames['pages'];
        $te = $this->tNames['elements'];
        $eot = '9999-12-31 23:59:59.999999';

        $query = "SELECT DISTINCT $tp.doc_id as 'id' FROM $tp, $te " .
            "WHERE $te.editor_tid=$userTid  and $tp.id=$te.page_id " .
            "AND $te.valid_until='$eot' AND $tp.valid_until='$eot'";

        $res = $this->getDatabaseHelper()->query($query);
        if ($res === false) {
            return [];
        }

        $docIds = [];
        while ($row = $res->fetch(PDO::FETCH_ASSOC)){
            $docIds[] = intval($row['id']);
        }
        return $docIds;
    }

    /**
     * @inheritDoc
     */
    public function getPageIdsTranscribedByUser(int $userTid, int $docId) : array
    {
        $tp = $this->tNames['pages'];
        $te = $this->tNames['elements'];
        $eot = '9999-12-31 23:59:59.999999';

        try {
            $docId = $this->getDocumentManager()->getLegacyDocId($docId);
        } catch (DocumentNotFoundException) {
            return [];
        }


        $query = "SELECT DISTINCT $tp.id FROM $tp, $te " .
            "WHERE $te.editor_tid=$userTid AND $te.page_id = $tp.id  AND $tp.doc_id = $docId " .
            "AND $te.valid_until='$eot' AND $tp.valid_until='$eot'";
        $this->logger->debug("Querying: '$query'");
        $res = $this->getDatabaseHelper()->query($query);
        if ($res === false) {
            return [];
        }

        $pageIds = [];
        while ($row = $res->fetch(PDO::FETCH_ASSOC)){
            $pageIds[] = intval($row['id']);
        }
        if ($docId > 2000) {
            $this->logger->debug("Page Ids for user $userTid, doc $docId", [ 'pageIds' => $pageIds ]);
        }
        return $pageIds;
    }

    /**
     * Updates an element in the database.
     * If there's a change in the element's data besides the items, the current
     * version in the DB will be updated.
     *
     * The items will be updated as necessary.
     *
     * Returns the id of the updated element and a list of
     * ids for new items in the DB
     *
     * @param Element $newElement
     * @param Element $oldElement
     * @param array $itemIds
     * @param bool $time
     * @return array
     * @throws Exception
     */
    public function updateElement(Element $newElement, Element $oldElement, array $itemIds = [], bool|string $time = false): array
    {
        if (!$time) {
            $time = TimeString::now();
        }
        // Force element IDs to be same, we're only dealing with the element's data
        if ($newElement->id !== $oldElement->id) {
            $newElement->id = $oldElement->id;
        }

        $this->logger->debug("   UPDATING ELEMENT $oldElement->id");

        // Force columnElementId in new element's items
        foreach ($newElement->items as $item) {
            $item->columnElementId = $newElement->id;

        }

        $editScript = ItemArray::getEditScript(
            $oldElement->items,
            $newElement->items
        );
        $ignoreNewEditor = true;


        $newItemsIndex = 0;
        foreach ($editScript as $editInstruction) {
            list ($index, $cmd, $newSeq) = $editInstruction;
            switch ($cmd) {
                case MyersDiff::KEEP:
                    $this->logger->debug("   Keeping item $index");
                    if ($oldElement->items[$index]->seq
                        !== $newSeq) {
                        $this->logger->debug("   ... with new seq $newSeq");
                        $oldElement->items[$index]->seq =
                            $newSeq;
                        $this->updateItemInDB(
                            $oldElement->items[$index],
                            $time
                        );
                    }

                    if ($oldElement->items[$index]->type === Item::ADDITION) {
                        $this->logger->debug("   Keeping an addition",get_object_vars($oldElement->items[$index]));
                        if ($oldElement->items[$index]->target !== 0) {
                            $this->logger->debug("   ...with non-zero target", [ 'target'=>$oldElement->items[$index]->target]);
                            if (!isset($itemIds[$oldElement->items[$index]->target])) {
                                $this->logger->warning("Addition without valid target @ pos $index", get_object_vars($oldElement->items[$index]));
                            }
                            else {
                                if ($oldElement->items[$index]->target !== $itemIds[$oldElement->items[$index]->target]) {
                                    $oldElement->items[$index]->target = $itemIds[$oldElement->items[$index]->target];
                                    $this->logger->debug("   ...with new target", [ 'target'=>$oldElement->items[$index]->target]);
//                                    $this->logger->debug("  ... .... time=" . $time);
                                    $this->updateItemInDB(
                                        $oldElement->items[$index],
                                        $time
                                    );
                                }
                            }
                        }
                    }
                    $itemIds[$newElement->items[$newItemsIndex]->id] = $oldElement->items[$index]->id;
                    $newItemsIndex++;
                    break;

                case MyersDiff::DELETE:
                    $this->logger->debug("  Deleting item $index");
//                    $this->logger->debug("... .... time=" . $time);
                    $this->getItemsDataTable()->deleteRowWithTime(
                        $oldElement->items[$index]->id,
                        $time
                    );
                    $ignoreNewEditor = false;
                    break;

                case MyersDiff::INSERT:
                    $this->logger->debug("   Inserting new item with seq $newSeq");
                    // This takes care of new addition with targets that
                    // come earlier in the item sequence in the same element,
                    // which is the most usual case
                    if ($newElement->items[$index]->type === Item::ADDITION &&
                        $newElement->items[$index]->target) {
                        if (!isset($itemIds[$newElement->items[$index]->target])) {
                            $this->logger->warning("Addition without valid target @ pos $index", get_object_vars($newElement->items[$index]));
                        } else {
                            $this->logger->debug("   Setting addition target " .
                                $newElement->items[$index]->target .
                                " => " .
                                $itemIds[$newElement->items[$index]->target]);
                            $newElement->items[$index]->target =
                                $itemIds[$newElement->items[$index]->target];
                        }

                    }
                    $newItemId = $this->createNewItemInDB(
                        $newElement->items[$index],
                        $time
                    );
                    if ($newItemId === -1) {
                        $this->logger->error("Could not create new item in DB", [ 'class' => __CLASS__, 'function' => __FUNCTION__]);
                        throw new RuntimeException("Could not add new item in DB");
                    }
                    $this->logger->debug("   ... with item Id = $newItemId");

                    $itemIds[$newElement->items[$newItemsIndex]->id] = $newItemId;
                    $newItemsIndex++;
                    $ignoreNewEditor = false;
                    break;
            }
        }
        if (!$ignoreNewEditor && $newElement->editorTid !== $oldElement->editorTid) {
            $this->logger->debug("   ...changes by new editor: $newElement->editorTid");
        }
        if (!Element::isElementDataEqual($newElement, $oldElement, true, $ignoreNewEditor, false)) {
            $this->logger->debug("   ...updating element in DB");
//            $this->logger->debug("... .... time=" . $time);
            $this->updateElementInDB($newElement, $time);
        }

        return [$newElement->id, $itemIds];
    }

    private function updateItemInDB($item, $time = false): bool
    {
        if (!$time) {
            $time = TimeString::now();
        }
        try {
            $this->getItemsDataTable()->realUpdateRowWithTime([
                'id' => $item->id,
                'ce_id' => $item->columnElementId,
                'type' => $item->type,
                'seq' => $item->seq,
                'lang' => $item->lang,
                'hand_id' => $item->handId,
                'text' => $item->theText,
                'alt_text' => $item->altText,
                'extra_info' => $item->extraInfo,
                'length' => $item->length,
                'target' => $item->target
            ], $time);
        } catch (InvalidRowUpdateTime|RowDoesNotExist|InvalidTimeStringException $e) {
            throw new RuntimeException($e->getMessage(), $e->getCode());
        }
        return true;
    }
}
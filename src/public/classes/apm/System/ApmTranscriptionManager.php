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
use APM\FullTranscription\ApmPageManager;
use APM\FullTranscription\ApmTranscriptionWitness;
use APM\FullTranscription\PageInfo;
use APM\FullTranscription\PageManager;
use APM\FullTranscription\TranscriptionManager;
use AverroesProject\Data\EdNoteManager;
use AverroesProject\Data\MySqlHelper;
use AverroesProject\TxText\Item as ApItem;
use DataTable\MySqlDataTable;
use DataTable\MySqlUnitemporalDataTable;
use DataTable\TimeString;
use InvalidArgumentException;
use PDO;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ErrorReporter\iErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

class ApmTranscriptionManager extends TranscriptionManager implements  iSqlQueryCounterTrackerAware, iErrorReporter, LoggerAwareInterface
{

    use SimpleSqlQueryCounterTrackerAware {
        setSqlQueryCounterTracker as private localSetSqlQueryCounterTracker;
    }
    use SimpleErrorReporterTrait;
    use LoggerAwareTrait;

    /**
     * @var PDO
     */
    private $dbConn;
    /**
     * @var MySqlDataTable
     */
    private $docsDataTable;
    /**
     * @var MySqlDataTable
     */
    private $pageTypesTable;
    /**
     * @var MySqlUnitemporalDataTable
     */
    private $pagesDataTable;
    /**
     * @var MySqlUnitemporalDataTable
     */
    private $elementsDataTable;
    /**
     * @var MySqlUnitemporalDataTable
     */
    private $itemsDataTable;
    /**
     * @var MySqlDataTable
     */
    private $worksTable;
    /**
     * @var MySqlDataTable
     */
    private $txVersionsTable;
    /**
     * @var MySqlHelper
     */
    private $databaseHelper;
    /**
     * @var EdNoteManager
     */
    private $edNoteManager;
    /**
     * @var array
     */
    private $tNames;
    /**
     * @var ApmPageManager
     */
    private $pageManager;

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

        $this->setLogger($logger);
    }


    public function setSqlQueryCounterTracker(SqlQueryCounterTracker $tracker): void
    {
        $this->localSetSqlQueryCounterTracker($tracker);
        $this->pageManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());
    }

    public function getTranscriptionWitness(int $docId, string $workId, int $chunkNumber, string $timeString): ApmTranscriptionWitness
    {
        // TODO: Implement getTranscriptionWitness() method.
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
    public function getChunkLocationMapForChunk(string $workId, int $chunkNumber, string  $timeString): array
    {
        return $this->getChunkLocationMapFromDatabase([ 'work_id' => "='$workId'", 'chunk_number' => "=$chunkNumber"], $timeString);
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
            /** @var ApmChunkMarkLocation $location */
            if (!isset($chunkLocations[$location->workId][$location->chunkNumber][$location->docId][$location->segmentNumber])) {
                $segmentLocation = new ApmChunkSegmentLocation();
                if ($location->type === 'start') {
                    $segmentLocation->start = $location;
                } else {
                    $segmentLocation->end = $location;
                }
                $chunkLocations[$location->workId][$location->chunkNumber][$location->docId][$location->segmentNumber] = $segmentLocation;
                continue;
            }
            $segmentLocation = $chunkLocations[$location->workId][$location->chunkNumber][$location->docId][$location->segmentNumber];
            if ($location->type === 'start') {
                $segmentLocation->start = $location;
            } else {
                $segmentLocation->end = $location;
            }
        }

        return $chunkLocations;
    }


    private function getChunkLocationMapFromDatabase(array $conditions, string $timeString) : array
    {
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
                default:
                    throw new InvalidArgumentException('Unrecognized field in conditions: ' . $field);
            }
        }
        if (count($conditionsSql) !== 0) {
            $conditionsSqlString = ' AND ' . implode(' AND ', $conditionsSql);
        } else {
            $conditionsSqlString = '';
        }


        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);

        $query = "SELECT $tp.doc_id as 'doc_id', $tp.seq as 'page_seq'," .
            " $te.column_number," .
            " $te.seq as 'e_seq'," .
            " $ti.seq as 'item_seq'," .
            " $ti.alt_text as 'type'," .
            " $ti.text as 'work_id'," .
            " $ti.target as 'chunk_number'," .
            " $ti.length as 'segment_number'" .
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

        $r = $this->databaseHelper->query($query);

        $chunkMarkLocations = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)) {
            $location = new ApmChunkMarkLocation();
            $location->docId = (int) $row['doc_id'];
            $location->workId = $row['work_id'];
            $location->chunkNumber = (int) $row['chunk_number'];
            if (is_null($row['segment_number'])) {
                $location->segmentNumber = 1;  // very old items in the db did not have a segment number!
            } else {
                $location->segmentNumber = (int) $row['segment_number'];
            }
            $location->type = $row['type'];

            $location->pageSequence = (int) $row['page_seq'];
            $location->columnNumber = (int) $row['column_number'];
            $location->elementSequence = (int) $row['e_seq'];
            $location->itemSequence = (int) $row['item_seq'];
            $chunkMarkLocations[] = $location;
        }

        return $this->createChunkLocationMapFromChunkMarkLocations($chunkMarkLocations);

    }

    /**
     * Returns the page numbers of the pages with transcription
     * data for a document Id
     * @param int $docId
     * @param int $order
     * @return array
     */
    public function getTranscribedPageListByDocId(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER) : array
    {
        $te = $this->tNames['elements'];
        $tp = $this->tNames['pages'];

        $orderby = 'page_number';
        if ($order === self::ORDER_BY_SEQ) {
            $orderby = 'seq';
        }


        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
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
}
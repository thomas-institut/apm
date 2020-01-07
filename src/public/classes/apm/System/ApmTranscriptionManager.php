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
use APM\FullTranscription\ApmItemLocation;
use APM\FullTranscription\ApmTranscriptionWitness;
use APM\FullTranscription\PageInfo;
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

    use SimpleSqlQueryCounterTrackerAware;
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

    public function __construct(PDO $dbConn, array $tableNames, LoggerInterface $logger)
    {

        $this->dbConn = $dbConn;
        $this->databaseHelper = new MySqlHelper($dbConn, $logger);
        $this->edNoteManager = new EdNoteManager($dbConn, $this->databaseHelper, $tableNames,
            $logger);
        $this->tNames  = $tableNames;

        $this->docsDataTable = new MySqlDataTable($this->dbConn,
            $tableNames[ApmMySqlTableName::TABLE_DOCS]);
        $this->pageTypesTable = new MySqlDataTable($this->dbConn,
            $tableNames[ApmMySqlTableName::TABLE_PAGETYPES]);
        $this->pagesDataTable = new MySqlUnitemporalDataTable(
            $this->dbConn,
            $tableNames[ApmMySqlTableName::TABLE_PAGES]);
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


    public function getTranscriptionWitness(int $docId, string $workId, int $chunkNumber, string $timeString): ApmTranscriptionWitness
    {
        // TODO: Implement getTranscriptionWitness() method.
    }

    /**
     * @inheritDoc
     */
    public function getChunkLocationsInDoc(int $docId, string $timeString): array
    {
        $ti = $this->tNames[ApmMySqlTableName::TABLE_ITEMS];
        $te = $this->tNames[ApmMySqlTableName::TABLE_ELEMENTS];
        $tp = $this->tNames[ApmMySqlTableName::TABLE_PAGES];

        if ($timeString === '') {
            $timeString = TimeString::now();
        }

        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);

        $query = "SELECT $tp.seq as 'page_seq'," .
            " $te.column_number," .
            " $te.seq as 'e_seq'," .
            " $ti.seq as 'item_seq'," .
            " $ti.alt_text as 'type'," .
            " $ti.text as 'workId'," .
            " $ti.target as 'chunkNumber'," .
            " $ti.length as 'segment'" .
            " FROM $tp" .
            " JOIN ($te, $ti)" .
            " ON ($te.id=$ti.ce_id AND $tp.id=$te.page_id)" .
            " WHERE $ti.type=" . ApItem::CHUNK_MARK .
       //     " AND $ti.text='$workId'" .
        //    " AND $ti.target=$chunkNumber" .
            " AND $tp.doc_id=$docId" .
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
            //$this->logger->debug("Chunk location row ", $row);
            $location = new ApmChunkMarkLocation();
            $location->docId = $docId;
            $location->workId = $row['workId'];
            $location->chunkNumber = (int) $row['chunkNumber'];
            if (is_null($row['segment'])) {
                $location->segmentNumber = 1;  // very old items in the db did not have a segment number!
            } else {
                $location->segmentNumber = (int) $row['segment'];
            }
            $location->type = $row['type'];

            $location->pageSequence = (int) $row['page_seq'];
            $location->columnNumber = (int) $row['column_number'];
            $location->elementSequence = (int) $row['e_seq'];
            $location->itemSequence = (int) $row['item_seq'];
            //$this->logger->debug("Chunk location object ", get_object_vars($location));
            $chunkMarkLocations[] = $location;
        }

        return $this->getChunkLocationsFromMarkLocationArray($chunkMarkLocations);
    }

    /**
     * @inheritDoc
     */
    public function getAllChunkMarkLocationsForChunk(string $workId, int $chunkNumber, string  $timeString): array
    {
        // TODO: Implement getAllChunkMarkLocationsForChunk() method.
    }

    /**
     * @param ApmChunkMarkLocation[] $chunkMarkLocations
     * @return array
     */
    private function getChunkLocationsFromMarkLocationArray(array $chunkMarkLocations) : array {

        $chunkLocations = [];

        foreach ($chunkMarkLocations as $location) {
            /** @var ApmChunkMarkLocation $location */
            if (!isset($chunkLocations[$location->workId][$location->chunkNumber][$location->segmentNumber])) {
                $segmentLocation = new ApmChunkSegmentLocation();
                if ($location->type === 'start') {
                    $segmentLocation->start = $location;
                } else {
                    $segmentLocation->end = $location;
                }
                $chunkLocations[$location->workId][$location->chunkNumber][$location->segmentNumber] = $segmentLocation;
                continue;
            }
            $segmentLocation = $chunkLocations[$location->workId][$location->chunkNumber][$location->segmentNumber];
            if ($location->type === 'start') {
                $segmentLocation->start = $location;
            } else {
                $segmentLocation->end = $location;
            }
        }

        return $chunkLocations;
    }


    public function getPageInfoByDocSeq(int $docId, int $seq) : PageInfo {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $rows = $this->pagesDataTable->findRows([
            'doc_id' => $docId,
            'seq'=> $seq
        ],1);
        if ($rows === []) {
           throw new InvalidArgumentException("No page info found for $docId : $seq");
        }
        return PageInfo::createFromDatabaseRow($rows[0]);
    }


}
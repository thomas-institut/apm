<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

namespace APM\CollationTable;


use InvalidArgumentException;
use PDO;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\DataTable\UnitemporalDataTable;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTrackerAware;
use ThomasInstitut\TimeString\TimeString;

class ApmCollationTableManager extends CollationTableManager implements LoggerAwareInterface, SqlQueryCounterTrackerAware
{
    use SimpleErrorReporterTrait;
    use LoggerAwareTrait;
    use SimpleSqlQueryCounterTrackerAware;

    const ERROR_CANNOT_SAVE = 101;

    /**
     * @var UnitemporalDataTable
     */
    private UnitemporalDataTable $ctTable;
    /**
     * @var CollationTableVersionManager
     */
    private CollationTableVersionManager $versionManager;

    public function __construct(UnitemporalDataTable $ctTable, CollationTableVersionManager $versionManager, LoggerInterface $logger)
    {
        $this->ctTable = $ctTable;
        $this->versionManager = $versionManager;
        $this->setLogger($logger);
    }


    public function getCollationTableVersionManager(): CollationTableVersionManager
    {
        return $this->versionManager;
    }


    public function getCollationTableById(int $collationTableId, string $timeStamp = '') : array
    {

        //$this->logger->debug("Getting ctable $collationTableId at time '$timeStamp'");
        if ($timeStamp === '') {
            $timeStamp = TimeString::now();
        }
        $rows = $this->ctTable->findRowsWithTime([ 'id' => $collationTableId], 1, $timeStamp);

        if (count($rows) === 0) {
            throw new InvalidArgumentException("Collation table id does not exist");
        }

        $dbData = $rows[0];
        $isCompressed = intval($dbData['compressed']) === 1;
        //$this->logger->debug("CT data is compressed: $isCompressed", [ 'dbData' => $dbData]);

        if ($isCompressed) {
            $dataJson = gzuncompress($dbData['data']);
        } else {
            $dataJson = $dbData['data'];
        }

        $ctData = json_decode($dataJson, true);

        // Fill in type!
        if (!isset($ctData['type'])) {
            $ctData['type'] = CollationTableType::COLLATION_TABLE;
        }

        // Handle archived tables
        $ctData['archived'] = intval($dbData['archived']) === 1;

        return $ctData;

    }

    public function saveNewCollationTable(array $collationTableData, CollationTableVersionInfo $versionInfo) : int
    {
        $time = TimeString::now();
        $dbRow = $this->getDbRowFromCollationData($collationTableData, true, true);
        $collationTableId = $this->ctTable->createRowWithTime($dbRow, $time);
        $this->logger->debug("New id: $collationTableId");
        $versionInfo->timeFrom = $time;
        $versionInfo->collationTableId = $collationTableId;
        if ($versionInfo->description === '') {
            $versionInfo->description = "Saved from automatic collation table";
        }
        $this->versionManager->registerNewCollationTableVersion($collationTableId, $versionInfo);
        return $collationTableId;
    }

    public function saveCollationTable(int $collationTableId, array $collationTableData, CollationTableVersionInfo $versionInfo) : void
    {
        $time = TimeString::now();
        $dbRow = $this->getDbRowFromCollationData($collationTableData, true);
        $dbRow['id'] = $collationTableId;
        $this->ctTable->updateRowWithTime($dbRow, $time);
        $versionInfo->timeFrom = $time;
        $this->versionManager->registerNewCollationTableVersion($collationTableId, $versionInfo);
    }

    protected function getDbRowFromCollationData(array $collationTableData, $compress = false, $allowSingleWitness = false): array
    {

        $problems = CtData::checkCollationTableConsistency($collationTableData);
        if (count($problems) > 0) {
            $this->logger->error("Inconsistent CtData", ['problems' => $problems]);
            throw new InvalidArgumentException("Inconsistent CtData");
        }

        $chunkId = $collationTableData['chunkId'] ?? $collationTableData['witnesses'][0]['chunkId'];

        // generate witness array
        $witnessArray = [];
        foreach($collationTableData['witnesses'] as $i => $witness) {
            if (!isset($witness['ApmWitnessId'])) {
                throw new InvalidArgumentException("No witness id in witness $i");
            }
            $witnessArray[] = $witness['ApmWitnessId'];

            if ($witness['witnessType'] !== 'source' && $witness['chunkId'] !== $chunkId) {
                throw new InvalidArgumentException("Invalid chunk Id found in witness $i");
            }
        }

        $witnessJson= json_encode($witnessArray);

        if (!isset($collationTableData['title'])) {
           $collationTableData['title'] = 'CollationTable ' . random_int(1000000, 9999999);
        }

        $title =  $collationTableData['title'];
        if (!isset($collationTableData['type'])) {
            $collationTableData['type'] = CollationTableType::COLLATION_TABLE;
        }

        if (!isset($collationTableData['archived'])) {
            $collationTableData['archived'] = false;
        }

        $dataToSave = json_encode($collationTableData);
        if ($compress) {
            $dataToSave = gzcompress($dataToSave);
        }

        return [
            'title' => $title,
            'type' => $collationTableData['type'],
            'chunk_id' => $chunkId,
            'witnesses_json' => $witnessJson,
            'compressed' => $compress ? 1 : 0,
            'archived' => $collationTableData['archived'] ? 1 : 0,
            'data' => $dataToSave
        ];

    }


    public function getActiveEditionTableInfo(): array {
        $rows = $this->ctTable->findRowsWithTime(['archived' => 0, 'type' =>'edition'], 0,  TimeString::now());
        $results = [];
        foreach($rows as $row) {
            $id = intval($row['id']);
            $versionInfoArray = $this->getCollationTableVersionManager()->getCollationTableVersionInfo($id, 1);
            if (count($versionInfoArray) === 0) {
                $this->logger->warning("No versions found for supposedly active edition with id $id");
                continue;
            }
            $results[] = [
                'id' => $id,
                'title' => $row['title'],
                'chunkId' => $row['chunk_id'],
                'lastVersion' => $versionInfoArray[0]
                ];
        }
        return $results;
    }

    public function getCollationTableIdsForChunk(string $chunkId, string $timeString): array
    {

        $mySqlDataTableClass = MySqlUnitemporalDataTable::class;

        if (is_a($this->ctTable, $mySqlDataTableClass) ) {
            //$this->logger->debug("Using MySql datatable optimization");
            // we can get just the ids with a custom select query on a MySqlDataTable
            /** @var MySqlUnitemporalDataTable $ctTable */
            $ctTable = $this->ctTable;

            $result = $ctTable->select('id',
                "chunk_id='$chunkId' AND valid_from <='$timeString' and valid_until>'$timeString'",
                0,
                '',
                "getCollationTableIdsForChunk");
            $rows = $result->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $rows = $this->ctTable->findRowsWithTime(['chunk_id' => $chunkId], 0,  $timeString);
        }

        $idArray = [];
        foreach ($rows as $row) {
            $idArray[] = intval($row['id']);
        }

        return $idArray;
    }

    public function getCollationTableInfo(int $id, string $timeStamp = ''): CollationTableInfo
    {
        $mySqlDataTableClass = MySqlUnitemporalDataTable::class;
        if ($timeStamp === '') {
            $timeStamp = TimeString::now();
        }

        if (is_a($this->ctTable, $mySqlDataTableClass) ) {
            //$this->logger->debug("Using MySql datatable optimization");
            // we can get just the ids with a custom select query on a MySqlDataTable
            /** @var MySqlUnitemporalDataTable $ctTable */
            $ctTable = $this->ctTable;

            $result = $ctTable->select('id, title, type, archived, valid_from, valid_until',
                "id='$id' AND valid_from <='$timeStamp' and valid_until>'$timeStamp'",
                0,
                '',
                "getCollationTableInfo");

            $rows = $result->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $rows = $this->ctTable->findRowsWithTime(['id' => $id], 0,  $timeStamp);
        }

        if (count($rows)=== 0) {
            throw new InvalidArgumentException("Table does not exist");
        }
//        $this->logger->debug('dbrows', $rows);

        return CollationTableInfo::createFromDbRow($rows[0]);
    }

    public function getCollationTableStoredVersionsInfo(int $id): array
    {
        $returnArray = [];

        if (!is_a($this->ctTable, MySqlUnitemporalDataTable::class)) {
            // for datatable without time stamp, just
            // return the data for the currently stored version
            return [ $this->getCollationTableInfo($id)];
        }

        /** @var MySqlUnitemporalDataTable $ctTable */
        $ctTable = $this->ctTable;

        $result = $ctTable->select('id, title, type, archived, valid_from, valid_until',
            "id='$id' ",
            0,
            'valid_from',
            "getCollationTableStoredVersionsInfo");

        $rows = $result->fetchAll(PDO::FETCH_ASSOC);

        foreach($rows as $row) {
            $returnArray[] = CollationTableInfo::createFromDbRow($row);
        }

        return $returnArray;
    }
}
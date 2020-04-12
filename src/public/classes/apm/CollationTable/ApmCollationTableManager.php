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


use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataTable\MySqlDataTable;
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
    private $ctTable;
    /**
     * @var CollationTableVersionManager
     */
    private $versionManager;

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


    public function getCollationTableByIdWithTimestamp(int $collationTableId, string $timeStamp)
    {
        $rows = $this->ctTable->findRowsWithTime([ 'id' => $collationTableId], 1, $timeStamp);

        if (count($rows) === 0) {
            throw new \InvalidArgumentException("Collation table id does not exist");
        }

        $dbData = $rows[0];
        $isCompressed = $dbData['compressed'] === '1';

        if ($isCompressed) {
            $dataJson = gzuncompress($dbData['data']);
        } else {
            $dataJson = $dbData['data'];
        }

        return json_decode($dataJson);


    }

    public function getCollationTableByIdWithVersion(int $id, int $versionId)
    {
        // TODO: Implement getCollationTableByIdWithVersion() method.
    }

    public function saveNewCollationTable(array $collationTableData, CollationTableVersionInfo $versionInfo) : int
    {
        $time = TimeString::now();
        $dbRow = $this->getDbRowFromCollationData($collationTableData, false);
        $collationTableId = $this->ctTable->createRowWithTime($dbRow, $time);
        $versionInfo->timeFrom = $time;
        $versionInfo->collationTableId = $collationTableId;
        if ($versionInfo->description === '') {
            $versionInfo->description = "Saved from automatic collation table";
        }
        $this->versionManager->registerNewCollationTable($collationTableId, $versionInfo);
        return $collationTableId;
    }

    public function saveCollationTable(int $collationTableId, array $collationTableData, CollationTableVersionInfo $versionInfo)
    {
        $time = TimeString::now();
        $dbRow = $this->getDbRowFromCollationData($collationTableData, true);
        $dbRow['id'] = $collationTableId;
        $this->ctTable->updateRowWithTime($dbRow, $time);
        $versionInfo->timeFrom = $time;
        $this->versionManager->registerNewCollationTable($collationTableId, $versionInfo);
        return $collationTableId;
    }

    protected function getDbRowFromCollationData(array $collationTableData, $compress = false) {
        if (!isset($collationTableData['witnesses'])) {
            throw new \InvalidArgumentException("No witnesses in collation table");
        }

        $numWitnesses = count($collationTableData['witnesses']);
        if ( $numWitnesses < 2) {
            throw new \InvalidArgumentException("Not enough witnesses in collation table");
        }

        if (!isset($collationTableData['collationMatrix'])) {
            throw new \InvalidArgumentException("No collation table matrix  in data");
        }

        if (count($collationTableData['collationMatrix']) !== $numWitnesses) {
            throw new \InvalidArgumentException("Invalid collation table matrix");
        }

        $chunkId = $collationTableData['witnesses'][0]['chunkId'];

        // generate witness array
        $witnessArray = [];
        foreach($collationTableData['witnesses'] as $i => $witness) {
            if (!isset($witness['ApmWitnessId'])) {
                throw new \InvalidArgumentException("No witness id in witness $i");
            }
            $witnessArray[] = $witness['ApmWitnessId'];
            if ($witness['chunkId'] !== $chunkId) {
                throw new \InvalidArgumentException("Invalid chunk Id found in witness $i");
            }
        }

        $witnessJson= json_encode($witnessArray);

        if (!isset($collationTableData['title'])) {
           $collationTableData['title'] = 'CollationTable ' . random_int(1000000, 9999999);
        }

        $title =  $collationTableData['title'];
        $dataToSave = json_encode($collationTableData);
        if ($compress) {
            $dataToSave = gzcompress($dataToSave);
        }

        return [
            'title' => $title,
            'chunk_id' => $chunkId,
            'witnesses_json' => $witnessJson,
            'compressed' => $compress ? 1 : 0,
            'data' => $dataToSave
        ];

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
            $rows = $result->fetchAll(\PDO::FETCH_ASSOC);
        } else {
            $rows = $this->ctTable->findRowsWithTime(['chunk_id' => $chunkId], 0,  $timeString);
        }

        $idArray = [];
        foreach ($rows as $row) {
            $idArray[] = intval($row['id']);
        }

        return $idArray;
    }

    public function getCollationTableTitle(int $id, string $timeString): string
    {
        $mySqlDataTableClass = MySqlUnitemporalDataTable::class;

        if (is_a($this->ctTable, $mySqlDataTableClass) ) {
            //$this->logger->debug("Using MySql datatable optimization");
            // we can get just the ids with a custom select query on a MySqlDataTable
            /** @var MySqlUnitemporalDataTable $ctTable */
            $ctTable = $this->ctTable;

            $result = $ctTable->select('id, title',
                "id='$id' AND valid_from <='$timeString' and valid_until>'$timeString'",
                0,
                '',
                "getCollationTableIdsForChunk");

            $rows = $result->fetchAll(\PDO::FETCH_ASSOC);
        } else {
            $rows = $this->ctTable->findRowsWithTime(['id' => $id], 0,  $timeString);
        }

        if (count($rows)=== 0) {
            throw new \InvalidArgumentException("Table does not exist");
        }

        return $rows[0]['title'];
    }
}
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


use APM\StandardData\StandardTokenClass;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use ThomasInstitut\ErrorReporter\ErrorReporter;

/**
 * Class CollationTableManager
 *
 * Manages stored collation table standard data structures in the system
 *
 * Each collation table has an integer Id and a number of versions identified by
 * a TimeString
 *
 *
 * @package APM\CollationTable
 */
abstract class CollationTableManager implements ErrorReporter
{

    const ERROR_ALREADY_AN_EDITION = 101;
    const ERROR_DOES_NOT_EXIST = 102;
    const ERROR_INVALID_TIME_FROM = 103;
    const ERROR_STRATEGY_NOT_SUPPORTED = 104;

    const INIT_STRATEGY_TOP_WITNESS = 'topWitness';
    const INIT_STRATEGY_MOST_COMMON_VARIANT = 'mostCommonVariant';

    /**
     * Saves a new collation table in the system. Returns the Id of the new collation table
     * or -1 if there's an error.
     * @param array $collationTableData
     * @param CollationTableVersionInfo $versionInfo
     * @return int
     */
    abstract public function saveNewCollationTable(array $collationTableData, CollationTableVersionInfo $versionInfo) : int;

    /**
     * @param int $collationTableId
     * @param array $collationTableData
     * @param CollationTableVersionInfo $versionInfo
     */
    abstract public function saveCollationTable(int $collationTableId, array $collationTableData, CollationTableVersionInfo $versionInfo) : void;

    /**
     * Returns an array with the table Ids for tables for the given chunkId
     * @param string $chunkId
     * @param string $timeString
     * @return int[]
     */
    abstract public function getCollationTableIdsForChunk(string $chunkId, string $timeString) : array;

    /**
     * Get the collation table data array for the given table Id at the given time
     *
     * if $timeStamp is '', returns the latest version of the collation table
     *
     * @param int $collationTableId
     * @param string $timeStamp
     * @return array
     */
    abstract public function getCollationTableById(int $collationTableId, string $timeStamp = '') : array;

    /**
     * Get the collation table title for the given table Id at the given time
     *
     * if $timeStamp is '', returns the title of the latest version of the collation table
     *
     * @param int $id
     * @param string $timeStamp
     * @return string
     */
    abstract public function getCollationTableInfo(int $id, string $timeStamp = '') : CollationTableInfo;



    abstract public function getCollationTableVersionManager() : CollationTableVersionManager;

    public function getCollationTableVersions(int $collationTableId) {
        return $this->getCollationTableVersionManager()->getCollationTableVersionInfo($collationTableId);
    }

    public function convertToEdition(int $collationTableId, string $strategy, int $authorId, string $timeStampFrom ='') {
        $info  = $this->getCollationTableInfo($collationTableId);
        if ($info->type === CollationTableType::EDITION) {
            throw new \InvalidArgumentException("Collation table $collationTableId already an edition",
                self::ERROR_ALREADY_AN_EDITION);
        }

        $lastVersionInfoArray = $this->getCollationTableVersionManager()
            ->getCollationTableVersionInfo($collationTableId, 1);
        if (count($lastVersionInfoArray) === 0) {
            throw new \InvalidArgumentException("Collation table $collationTableId does not exist",
                self::ERROR_DOES_NOT_EXIST);
        }
        $lastVersion = $lastVersionInfoArray[0];
        if ($lastVersion->timeFrom > $timeStampFrom) {
            throw new \InvalidArgumentException("Requested timeFrom $timeStampFrom is before last version for "
               . "collation table $collationTableId, " .
                $lastVersion->timeFrom, self::ERROR_INVALID_TIME_FROM);
        }

        $newVersionInfo = new CollationTableVersionInfo();
        $newVersionInfo->collationTableId = $collationTableId;
        $newVersionInfo->authorId = $authorId;
        $newVersionInfo->description = "Converted to edition using " . $strategy;
        $newVersionInfo->isMinor = false;
        $newVersionInfo->isReview = false;
        $ctData = $this->getCollationTableById($collationTableId);
        $editionData = $this->convertDataToEdition($collationTableId, $ctData, $strategy, $timeStampFrom);

        $this->saveCollationTable($collationTableId, $editionData, $newVersionInfo);
    }

    protected function convertDataToEdition(int $tableId, array $collationTableData,  string $strategy, string $timeStamp) : array {
        $newData = $collationTableData;

        $newData['type'] = CollationTableType::EDITION;

        $editionWitnessIndex = count($collationTableData['sigla']);
        $newData['sigla'][] = '-';
        $newData['witnessTitles'][] = 'Edition';
        $newOrder = [ $editionWitnessIndex];
        foreach($collationTableData['witnessOrder'] as $index) {
            $newOrder[] = $index;
        }
        $newData['witnessOrder'] = $newOrder;
        $editionWitness = [];
        $editionWitness['ApmWitnessId'] = WitnessSystemId::buildEditionId($collationTableData['chunkId'], $tableId, $timeStamp);
        $editionWitness['chunkId'] = $collationTableData['chunkId'];
        $editionWitness['lang'] = $collationTableData['lang'];
        $editionWitness['witnessType'] = WitnessType::CHUNK_EDITION;
        switch($strategy) {
            case self::INIT_STRATEGY_TOP_WITNESS:
                // copy tokens from the top witness in the collation table
                $topWitness = $collationTableData['witnesses'][$collationTableData['witnessOrder'][0]];
                $topCtRow = $collationTableData['collationMatrix'][$collationTableData['witnessOrder'][0]];
                $newCtRow = [];
                $tokens = [];
                $currentTokenIndex = -1;
                for ($i = 0; $i < count($topCtRow); $i++) {
                    $ref = $topCtRow[$i];
                    if ($ref === -1) {
                        $newCtRow[] = -1;
                        continue;
                    }
                    $witnessToken = $topWitness['tokens'][$ref];
                    $tokens[] = [
                        'tokenClass' => StandardTokenClass::EDITION,
                        'tokenType' => $witnessToken['tokenType'],
                        'text' => $witnessToken['text']
                    ];
                    $currentTokenIndex++;
                    $newCtRow[] = $currentTokenIndex;
                }
                break;

            default:
                throw new \InvalidArgumentException("Conversion init strategy '$strategy' not supported",
                    self::ERROR_STRATEGY_NOT_SUPPORTED);
        }
        $editionWitness['tokens'] = $tokens;
        $editionWitness['timeStamp'] = $timeStamp;
        $newData['witnesses'][] = $editionWitness;
        $newData['collationMatrix'][] = $newCtRow;
        $newData['editionWitnessIndex'] = $editionWitnessIndex;

        return $newData;
    }

}
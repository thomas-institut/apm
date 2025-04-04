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
use APM\StandardData\StandardTokenType;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\TimeString\TimeString;

/**
 * Class CollationTableManager
 *
 * Manages stored collation table standard data structures in the system
 *
 * Each collation table has an integer id and a number of versions identified by
 * a TimeString
 *
 *
 * @package APM\CollationTable
 */
abstract class CollationTableManager implements ErrorReporter
{

    const int ERROR_ALREADY_AN_EDITION = 101;
    const int ERROR_DOES_NOT_EXIST = 102;
    const int ERROR_INVALID_TIME_FROM = 103;
    const int ERROR_STRATEGY_NOT_SUPPORTED = 104;

    const string INIT_STRATEGY_TOP_WITNESS = 'topWitness';
    const string INIT_STRATEGY_MOST_COMMON_VARIANT = 'mostCommonVariant';

    /**
     * Saves a new collation table in the system. Returns the id of the new collation table
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
     * Get the collation table data array for the given table id at the given time
     *
     * if $timeStamp is '', returns the latest version of the collation table
     *
     * @param int $collationTableId
     * @param string $timeStamp
     * @return array
     */
    abstract public function getCollationTableById(int $collationTableId, string $timeStamp = '') : array;

    /**
     * Get the collation table title for the given table id at the given time
     *
     * if $timeStamp is '', returns the title of the latest version of the collation table
     *
     * @param int $id
     * @param string $timeStamp
     * @return CollationTableInfo
     */
    abstract public function getCollationTableInfo(int $id, string $timeStamp = '') : CollationTableInfo;

    abstract public function getCollationTableVersionManager() : CollationTableVersionManager;


    /**
     * Returns an array of CollationTableInfo for every version of the collation
     * table with the given id stored in the system.
     *
     * @param int $id
     * @return CollationTableInfo[]
     */
    abstract public function getCollationTableStoredVersionsInfo(int $id) : array;


    public function getEmptyChunkEdition(string $workId, int $chunkNumber, string $lang, string $title) : array {
        $ctData =  [];
        $ctData['lang'] = $lang;
        $ctData['sigla'] = [ '-'];
        $ctData['witnesses'] = [ [
            'ApmWitnessId' => "$workId-$chunkNumber-edition-xx",
            'chunkId' => "$workId-$chunkNumber",
            'lang' => $lang,
            'witnessType' => 'edition',
            'tokens' => [],
            'timeStamp' => TimeString::now()
        ]];
        $ctData['collationMatrix'] = [ []];
        $ctData['witnessTitles'] = [ 'Edition'];
        $ctData['witnessOrder'] = [ 0 ];
        $ctData['type'] = CollationTableType::EDITION;
        $ctData['chunkId'] = "$workId-$chunkNumber";
        $ctData['title'] = $title;
        $ctData['editionWitnessIndex'] = 0;
        $ctData['groupedColumns'] = [];
        $ctData['tableId'] = -1;
        $ctData['archived'] = false;
        $ctData['schemaVersion'] = "1.4";
        $ctData['siglaGroups'] = [];
        $ctData['automaticNormalizationsApplied'] = [];
        $ctData['customApparatuses'] = [];
        return $ctData;
    }

    /**
     * @param int $collationTableId
     * @return CollationTableVersionInfo[]
     */
    public function getCollationTableVersions(int $collationTableId): array {
        return $this->getCollationTableVersionManager()->getCollationTableVersionInfo($collationTableId);
    }

    public function convertToEdition(int $collationTableId, string $strategy, int $authorTid, string $timeStampFrom =''): void
    {
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
        $newVersionInfo->authorTid = $authorTid;
        $newVersionInfo->description = "Converted to edition getting text from " . $strategy;
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
        $oldOrder = $collationTableData['witnessOrder'] ?? [];
        if ($oldOrder === []) {
            for($i=0; $i<count($collationTableData['witnesses']); $i++){
                $oldOrder[] = $i;
            }
        }

        $newOrder = [ $editionWitnessIndex ];
        foreach($oldOrder as $index) {
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
                $topWitness = $collationTableData['witnesses'][$oldOrder[0]];
                $topCtRow = $collationTableData['collationMatrix'][$oldOrder[0]];
                $newCtRow = [];
                $tokens = [];
                $currentTokenIndex = -1;
                for ($i = 0; $i < count($topCtRow); $i++) {
                    $ref = $topCtRow[$i];
                    if ($ref === -1) {
                        // generate an empty token
                        $tokens[] = [
                            'tokenClass' => StandardTokenClass::EDITION,
                            'tokenType' => StandardTokenType::EMPTY,
                            'text' => ''
                        ];
                    } else {
                        // copy the top witness token
                        $witnessToken = $topWitness['tokens'][$ref];
                        $tokens[] = [
                            'tokenClass' => StandardTokenClass::EDITION,
                            'tokenType' => $witnessToken['tokenType'],
                            'text' => $witnessToken['text'],
                            'normalizedText' => $witnessToken['normalizedText'] ?? '',
                            'normalizationSource' => $witnessToken['normalizationSource'] ?? '',
                            ];
                    }

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
        $newData['customApparatuses'] = [
            [ 'type' => 'criticus', 'entries' => []],
            [ 'type' => 'fontium', 'entries' => []],
            [ 'type' => 'comparativus', 'entries' => []],
            [ 'type' => 'marginalia', 'entries' => []]
        ];


        return $newData;
    }


    /**
     * Returns an array with one element for each table in the system
     *
     *   ```
     * [
     *        tableId => int
     *        type => 'edition' | 'ctable'
     *        workId => string
     *        chunkNumber => string
     *        lastVersion => Timestring
     *        archived => boolean
     *  ]
     * ```
     *
     * @param bool $includeArchived  if true, archived tables are also listed
     * @param string|null $workId if not null, only tables for the given work id are listed.
     *        The method does not check if the given work id is valid. If workId is '', an empty
     *        array will be returned
     * @return array
     */
    abstract public function getTablesInfo(bool $includeArchived = false, ?string $workId = null) : array;
    abstract public function getActiveEditionTableInfo(): array;


    abstract public function checkDataConsistency($ids = []) : array;

    abstract public function getActiveTablesByWorkId(string $workId) : array;
}
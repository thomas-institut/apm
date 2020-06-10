<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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

use InvalidArgumentException;
use ThomasInstitut\TimeString\TimeString;

/**
 * Witnesses in the system are identified by a unique string that encodes type specific parameters
 * that uniquely determine a witness in the system
 *
 * Witness Ids follow this syntax:
 *      <workId>-<chunkNumber>-<type>-<type_specific_selector>
 *
 * where <type> is one of the constant in the WitnessType calls and <type_specific_selector> is
 * a string unique for witness of the given type.
 *
 * For type === WitnessType::FULL_TRANSCRIPTION
 *
 *    <type_specific_selector> ::  <doc_id>-<local_witness_id>-<timestamp>
 *     where
 *        <doc_id >is an integer
 *        <local_witness_id> is a string  (normally 'A', 'B', 'C', etc)
 *        <timestamp> a
 *
 *
 * @package APM\System
 */

class WitnessSystemId
{

    const ERROR_INVALID_SYSTEM_ID = 101;

    static public function buildEditionId(string $chunkId,  int $tableId, string $timeString = '') : string {
        if ($timeString !== '') {
            return implode('-', [$chunkId, WitnessType::CHUNK_EDITION, $tableId, TimeString::compactEncode($timeString)]);
        }
        return implode('-', [$chunkId, WitnessType::CHUNK_EDITION, $tableId]);
    }

    static public function buildFullTxId(string $workId, int $chunkNumber, int $docId, string $localWitnessId, string $timeString = '') : string {
        if ($timeString !== '') {
            return implode('-', [ $workId, $chunkNumber, WitnessType::FULL_TRANSCRIPTION, $docId, $localWitnessId, TimeString::compactEncode($timeString)]);
        }
        return implode('-', [ $workId, $chunkNumber, WitnessType::FULL_TRANSCRIPTION, $docId, $localWitnessId]);
    }

    static public function getType(string $witnessSystemId) : string {
        $fields = explode('-', $witnessSystemId);
        if (count($fields) < 3) {
            return '';
        }
        return $fields[2];
    }

    static public function getFullTxInfo(string $witnessSystemId) : WitnessInfo {
        $witnessInfo = new WitnessInfo();

        $fields = explode('-', $witnessSystemId);
        if (count($fields) < 3) {
            throw new InvalidArgumentException('Invalid system Id', self::ERROR_INVALID_SYSTEM_ID);
        }

        $witnessInfo->type = WitnessType::FULL_TRANSCRIPTION;
        $witnessInfo->workId = $fields[0];
        $witnessInfo->chunkNumber = intval($fields[1]);
        $witnessInfo->systemId = $witnessSystemId;
        $witnessInfo->typeSpecificInfo = [
            'docId' => intval($fields[3]),
            'localWitnessId' => isset($fields[4]) ? $fields[4] : 'A',
            'timeStamp' => isset($fields[5]) ? TimeString::compactDecode($fields[5]) : '',
        ];

        return $witnessInfo;
    }
}
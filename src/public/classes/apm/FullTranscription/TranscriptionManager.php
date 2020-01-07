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

namespace APM\FullTranscription;

use ThomasInstitut\ErrorReporter\iErrorReporter;

/**
 * Class TranscriptionManager
 *
 * Class to deal with a database containing full transcriptions
 *
 * @package APM\FullTranscription
 */
abstract class TranscriptionManager implements iErrorReporter
{

    /**
     * Returns the ApmTranscriptionWitness contained in the given document for the given work and chunk number
     * at the given time.
     * Throws an InvalidArgument exception if there's no valid witness.
     *
     * @param int $docId
     * @param string $workId
     * @param int $chunkNumber
     * @param string $timeString
     * @return ApmTranscriptionWitness
     */
    abstract public function getTranscriptionWitness(int $docId, string $workId, int $chunkNumber, string $timeString) : ApmTranscriptionWitness;

    /**
     * Returns an array of ApmChunkSegmentLocation containing the locations of all chunk segments in the given
     * docId at the given time.
     *
     * The returned array is an associative array with workId as keys, each element is an array with an element for each
     * chunk number present in the documents, and each one of these elements, in turn, is an array of ApmChunkSegmentLocation
     *
     * $returnedArray = [
     *   'workId1' =>  [
     *         chunkA => [
     *              segment1 => ApmChunkSegmentLocation1-1-1,
     *              segment2 => ApmChunkSegmentLocation1-1-2, ...
     *         ],
     *        chunkB => [
     *              segment1 => ApmChunkSegmentLocation1-2-1,
     *              segment2 => ApmChunkSegmentLocation1-2-2, ...
     *         ],
     *        ...
     *   ],
     *  'workId2' => [ ... ]
     *   ...
     * ]
     *
     *
     * @param int $docId
     * @param string $timeString
     * @return array
     */
    abstract public function getChunkLocationsInDoc(int $docId, string $timeString) : array;


    /**
     * Returns an array containing all chunk mark locations in the system for the given work and chunk
     *
     * The returned array has one element for each document with chunk marks in the system. Each element
     * is an array of chunk mark locations
     *
     *     $returnedArray = [
     *          docId1 => [ location1, location2, ... ],
     *          docId2 => [ location1, location2, ... ],
     *          ...
     *    ]
     *
     * @param string $workId
     * @param int $chunkNumber
     * @param string $timeString
     * @return array
     */
    abstract public function getAllChunkMarkLocationsForChunk(string $workId, int $chunkNumber, string $timeString) : array;


    abstract public function getPageInfoByDocSeq(int $docId, int $seq) : PageInfo;
}
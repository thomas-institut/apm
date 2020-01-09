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
     * Returns a "map" of chunk locations in a particular document at the given time.
     *
     * The returned array contains ApmChunkSegmentLocation objects arranged by work, chunk and document.
     *
     *
     * $returnedArray = [
     *   'workId1' =>  [
     *         chunkA => [
     *              docId1 => [
     *                  segment1 => ApmChunkSegmentLocation1-1-1,
     *                  segment2 => ApmChunkSegmentLocation1-1-2,
     *                  ...
     *             ],
     *             docId2 => [
     *                  segment1 => ApmChunkSegmentLocation1-1-1,
     *                  segment2 => ApmChunkSegmentLocation1-1-2,
     *                  ...
     *             ],
     *             ... // more docs
     *         ],
     *        chunkB => [
     *          docId1 => [
     *              segment1 => ApmChunkSegmentLocation1-2-1,
     *              segment2 => ApmChunkSegmentLocation1-2-2, ...
     *              ],
     *         docId2 => [
     *              ... segment locations ...
     *         ],
     *          ...  // more docs
     *   ],
     *  'workId2' => [ ... ],
     *   ... // more work Ids
     * ]
     *
     *
     * @param int $docId
     * @param string $timeString
     * @return array
     */
    abstract public function getChunkLocationMapForDoc(int $docId, string $timeString) : array;


    /**
     * Returns a map of chunk locations for the given chunk (workId / chunkNumber) at the given time
     *
     * @param string $workId
     * @param int $chunkNumber
     * @param string $timeString
     * @return array
     */
    abstract public function getChunkLocationMapForChunk(string $workId, int $chunkNumber, string $timeString) : array;


    abstract public function getPageInfoByDocSeq(int $docId, int $seq) : PageInfo;
}
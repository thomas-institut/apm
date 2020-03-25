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

use APM\System\WitnessInfo;
use ThomasInstitut\ErrorReporter\ErrorReporter;

/**
 * Class TranscriptionManager
 *
 * Class to deal with a database containing full transcriptions
 *
 * @package APM\FullTranscription
 */
abstract class TranscriptionManager implements ErrorReporter
{
    const ORDER_BY_PAGE_NUMBER = 100;
    const ORDER_BY_SEQ = 101;

    abstract public function getPageManager() : PageManager;
    abstract public function getDocManager() : DocManager;
    abstract public function getColumnVersionManager() : ColumnVersionManager;

    /**
     * Returns the ApmTranscriptionWitness contained in the given document for the given work and chunk number
     * at the given time.
     * Throws an InvalidArgument exception if there's no valid witness.
     *
     * @param string $workId
     * @param int $chunkNumber
     * @param int $docId
     * @param string $localWitnessId
     * @param string $timeStamp
     * @return ApmTranscriptionWitness
     */
    abstract public function getTranscriptionWitness(string $workId, int $chunkNumber, int $docId, string $localWitnessId, string $timeStamp) : ApmTranscriptionWitness;

    /**
     * Returns a "map" of chunk locations in a particular document at the given time.
     *
     * The returned array contains ApmChunkSegmentLocation objects arranged by work, chunk, document and localWitnessId
     *
     *
     * $returnedArray = [
     *   'workId1' =>  [
     *         chunkA => [
     *              docId1 => [
     *                  'A' => [
     *                      segment1 => ApmChunkSegmentLocation1-1-A-1,
     *                      segment2 => ApmChunkSegmentLocation1-1-A-2,
     *                      ...  more segments ....
     *                      ],
     *                  'B' =>
     *                      segment1 => ApmChunkSegmentLocation1-1-B-1,
     *                      segment2 => ApmChunkSegmentLocation1-1-B-2,
     *                      ...  more segments ....
     *                      ],
     *                  ... more local witness ids ....
     *             ],
     *             docId2 => [
     *                  'A' => [
     *                      segment1 => ApmChunkSegmentLocation1-1-A-1,
     *                      segment2 => ApmChunkSegmentLocation1-1-A-2,
     *                      ...  more segments ....
     *                      ],
     *                  'B' =>
     *                      segment1 => ApmChunkSegmentLocation1-1-B-1,
     *                      segment2 => ApmChunkSegmentLocation1-1-B-2,
     *                      ...  more segments ....
     *                      ],
     *                  ... more local witness ids ....
     *             ],
     *             ... // more docs
     *         ],
     *        chunkB => [
     *          docId1 => [
     *                  'A' => [
     *                      segment1 => ApmChunkSegmentLocation1-1-A-1,
     *                      segment2 => ApmChunkSegmentLocation1-1-A-2,
     *                      ...  more segments ....
     *                      ],
     *                  'B' =>
     *                      segment1 => ApmChunkSegmentLocation1-1-B-1,
     *                      segment2 => ApmChunkSegmentLocation1-1-B-2,
     *                      ...  more segments ....
     *                      ],
     *                  ... more local witness ids ....
     *         docId2 => [
     *              ... local witness ids ...
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

    /**
     * Returns the page numbers of the pages with transcription
     * data for a document Id
     *
     * @param int $docId
     * @param int $order
     * @return int[]
     */
    abstract  public function getTranscribedPageListByDocId(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER) : array;


    /**
     * Returns an array with version information for the given location up to the given time with
     * at most n elements.
     *
     * If $n <= 0, returns all versions
     *
     * @param ApmItemLocation $location
     * @param string $upToTimeString
     * @param int $n
     * @return ColumnVersionInfo[]
     */
    abstract public function getVersionsForLocation(ApmItemLocation $location, string $upToTimeString, int $n = 0): array;


    /**
     * Returns an array with version information about all the pages and columns in the chunk segment location
     * grouped by page sequence and column number:
     *
     * $returnedArray = [
     *      pageSeq1 => [ col1 => [ ... versions ...], col2 => [ ... versions ...] ... ],
     *      pageSeq2 => [ col1 => [ ... versions ...], col2 => [ ... versions ...] ... ],
     *     ...
     * ]
     *
     * @param ApmChunkSegmentLocation $chunkSegmentLocation
     * @return array
     */
    abstract public function getVersionsForSegmentLocation(ApmChunkSegmentLocation $chunkSegmentLocation) : array;


    /**
     * Returns all version information about every chunk segment location in the given location map.
     *
     * The returned array contains an array with version information in the same position in the map
     * as the relevant segment:
     *
     *  $map['workId'][chunkNumber][segment] => chunkSegmentLocation
     *
     * $returnedArray['workId'][chunkNumber][docId][segment] => [ pageSeq1 => [ col1 => [ ... versions ... ], col2 => ..
     *
     * @param array $chunkLocationMap
     * @return array
     */
    abstract public function getVersionsForChunkLocationMap(array $chunkLocationMap) : array;

    abstract  public function getLastChunkVersionFromVersionMap(array $versionMap): array;

    /**
     * Returns the last saved versions for page/col in the given document
     * @param int $docId
     * @param int $numSaves
     * @return ColumnVersionInfo[]
     */
    abstract public function getLastSavesForDoc(int $docId, int $numSaves) : array;

    /**
     * Returns an array of WitnessInfo object with the available witnessess for given chunk
     *
     * @param string $workId
     * @param int $chunkNumber
     * @return WitnessInfo[]
     */
    abstract public function getWitnessesForChunk(string $workId, int $chunkNumber) : array;

    /**
     * Returns an array of ApmSegmentLocation object with the locations
     * for the given fullTx witness
     * @param string $workId
     * @param int $chunkNumber
     * @param int $docId
     * @param string $localWitnessId
     * @param string $timeString
     * @return array
     */
    abstract public function getSegmentLocationsForFullTxWitness(string $workId, int $chunkNumber, int $docId, string $localWitnessId, string $timeString) : array;


    /**
     * Returns a full map of the transcriptions in the system at the given time
     *
     * @param string $timeString
     * @return array
     */
    abstract public function getFullChunkMap(string $timeString) : array;


    /**
     * Update a page's settings with the given information
     *
     * This needs to be done at the TranscriptionManager level and not necessarily
     * only at the PageManager level because some of the page settings may influence the status
     * of transcription witnesses. For example, a change in a page foliation makes the data for witnesses
     * in that page obsolete.
     *
     * @param int $pageId
     * @param PageInfo $newSettings
     * @param int $userId
     */
    abstract public function updatePageSettings(int $pageId, PageInfo $newSettings, int $userId) : void;
}
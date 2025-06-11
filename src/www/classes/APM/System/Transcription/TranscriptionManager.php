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

namespace APM\System\Transcription;

use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Document\PageInfo;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\WitnessInfo;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\DataTable\InvalidTimeStringException;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

/**
 *
 * Class with management methods for APM's full transcriptions.
 *
 * Full transcriptions in APM are associated with a page (which belongs to a
 * document) and a column number within that page. Every transcribed column in APM
 * is fully versioned and each one of these versions has a starting and an end time
 * in which they are valid. The last version is simply the version whose end
 * time is infinite (actually an END_OF_TIMES constant).
 *
 * The full transcription of a page:column contains an ordered list of **column elements** which
 * capture the main text in the column, as well as line gaps, page numbers, marginal glosses, long marginal additions,
 * and so on.
 *
 * Each **element**, in turn, contains an ordered list of **items**, which capture textual phenomena like
 * plain text, abbreviations, deletions, short additions, gaps as well as information added by the
 * transcriber such as editorial notes, indication of unclear or illegible text, etc.
 *
 * Transcribers can also insert chunk start and end marks within the main text of columns. This allows
 * the system to extract the text of that chunk in particular document, provided the chunk marks are coherent.
 * The transcribed text of the chunk of a work in a document at a particular point in time is called a "transcription
 * witness" for that chunk at work. This class contains methods to get information about these witnesses
 * as well as to extract their text.
 *
 */
abstract class TranscriptionManager implements ErrorReporter, LoggerAwareInterface
{

    use SimpleErrorReporterTrait;
    use LoggerAwareTrait;
    const int ORDER_BY_PAGE_NUMBER = 100;
    const int ORDER_BY_SEQ = 101;


    /**
     * Returns the DocumentManager associated with the TranscriptionManager
     * @return DocumentManager
     */
    abstract protected function getDocumentManager() : DocumentManager;

    /**
     * Returns the EdNoteManager associated with the TranscriptionManager
     * @return EdNoteManager
     */
    abstract public function getEdNoteManager() : EdNoteManager;

    /**
     * Returns the ColumnVersionManager associated with the TranscriptionManager
     * @return ColumnVersionManager
     */
    abstract public function getColumnVersionManager() : ColumnVersionManager;

    /**
     * Returns the ApmTranscriptionWitness contained in the given document for the given work and chunk number
     * at the given time.
     *
     * Throws an InvalidArgument exception if there's no valid witness.
     *
     * @param string $workId an APM work ID, e.g.  'AW47'
     * @param int $chunkNumber
     * @param int $docId
     * @param string $localWitnessId  a letter to identify possible different versions of the same chunk in
     *      the same document, e.g. 'A', 'B', etc.
     * @param string $timeStamp the desired time for the state of the transcription to query
     * @param string $defaultLanguageCode the language code to assign to items and elements that do not have one explicitly
     * @return ApmTranscriptionWitness
     */
    abstract public function getTranscriptionWitness(string $workId, int $chunkNumber, int $docId, string $localWitnessId, string $timeStamp, string $defaultLanguageCode) : ApmTranscriptionWitness;

    /**
     * Returns a "map" of work locations in a particular document at the given time.
     *
     * The returned array contains ApmChunkSegmentLocation objects arranged by work, chunk, document and localWitnessId
     *
     * ```
     *  $returnedArray = [
     *   'workId1' =>  [
     *         chunk1 => [
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
     *        chunk2 => [
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
     * ```
     *
     * @param int $docId
     * @param string $timeString
     * @return array
     */
    abstract public function getChunkLocationMapForDoc(int $docId, string $timeString) : array;


    /**
     * Returns a map of work locations for the given work (workId / chunkNumber) at the given time
     *
     * @param string $workId
     * @param int $chunkNumber
     * @param string $timeString
     * @return array
     */
    abstract public function getChunkLocationMapForChunk(string $workId, int $chunkNumber, string $timeString) : array;

    /**
     * Returns the page numbers of the pages with transcription
     * data for a document id
     *
     * @param int $docId
     * @param int $order
     * @return int[]
     * @throws DocumentNotFoundException
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
     * @throws PageNotFoundException|DocumentNotFoundException
     */
    abstract public function getVersionsForLocation(ApmItemLocation $location, string $upToTimeString, int $n = 0): array;


    /**
     * Returns an array with version information about all the pages and columns in the work segment location
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
     * Returns all version information about every work segment location in the given location map.
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
     * Returns an array of WitnessInfo object with the available witnesses for given work
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
     * @param string $workId
     * @param int $chunkNumber
     * @param int $docId
     * @param string $localWitnessId
     * @return string
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     */
    abstract public function getLastChangeTimestampForWitness(string $workId, int $chunkNumber, int $docId, string $localWitnessId) : string;

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
     * @param int $userTid
     * @throws PageNotFoundException
     * @throws DocumentNotFoundException
     */
    abstract public function updatePageSettings(int $pageId, PageInfo $newSettings, int $userTid) : void;


    /**
     * Convenience function to get a PageInfo object from a document id and a page sequence number
     * @throws PageNotFoundException
     * @throws DocumentNotFoundException
     */
    public function getPageInfoByDocSeq(int $docId, int $seq): PageInfo {
        return $this->getDocumentManager()->getPageInfo($this->getDocumentManager()->getPageIdByDocSeq($docId, $seq));
    }

    /**
     * Convenience function to get a PageInfo object from a document id and a page number
     * @throws PageNotFoundException
     * @throws DocumentNotFoundException
     */
    public function getPageInfoByDocPage(int $docId, int $pageNumber): PageInfo {
        return $this->getDocumentManager()->getPageInfo($this->getDocumentManager()->getPageIdByDocPage($docId, $pageNumber));
    }


    /**
     * @param int $pageId
     * @param int $col
     * @param string $timeString
     * @return Element[]
     * @throws InvalidTimeStringException
     */
    abstract public function getColumnElementsByPageId(int $pageId, int $col, string $timeString = ''): array;


    /**
     * Updates the elements for a given page and column numbers
     *
     * @param int $pageId
     * @param int $columnNumber
     * @param array $newElements
     * @param string $time
     * @return bool|array
     */
    abstract public function updateColumnElements(int $pageId, int $columnNumber, array $newElements, string $time = ''): bool|array;

    /**
     * Returns an array of document Ids for the documents
     * in which a user has done some transcription work
     *
     * @param int $userTid
     * @return int[]
     */
    abstract public function getDocIdsTranscribedByUser(int $userTid) : array;


    /**
     * Returns an array with the ids of all users that have
     * edited at least one element in the given document
     *
     * @param int $docId
     * @return int[]
     */
    abstract public function getEditorTidsByDocId(int $docId) : array;


    /**
     * Returns an array of strings with the APM ids of the works
     * with transcription in the system
     *
     * @return string[]
     */
    abstract public function getWorksWithTranscription() : array;


    /**
     * Returns an array with the chunk numbers of the given work that
     * have a transcription in the system
     *
     * @param string $apmWorkId
     * @return array
     */
    abstract public function getChunksWithTranscriptionForWorkId(string $apmWorkId) : array;

    /**
     * Returns the page Ids transcribed by a user in a given document
     *
     * @param int $userTid
     * @param int $docId
     * @return int[]
     */
    abstract public function getPageIdsTranscribedByUser(int $userTid, int $docId) : array;


    /**
     * Returns the number of pages that have transcriptions in the system
     * @return int
     */
    abstract public function getTranscribedPageCount() : int;
}
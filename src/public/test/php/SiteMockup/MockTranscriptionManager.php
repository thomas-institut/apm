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

use APM\FullTranscription\ApmTranscriptionWitness;
use APM\FullTranscription\PageInfo;
use APM\FullTranscription\PageManager;
use APM\FullTranscription\TranscriptionManager;

class MockTranscriptionManager extends TranscriptionManager
{

    /**
     * @inheritDoc
     */
    public function getTranscriptionWitness(string $workId, int $chunkNumber, int $docId, string $localWitnessId, string $timeStamp) : ApmTranscriptionWitness
    {
        // TODO: Implement getTranscriptionWitness() method.
    }

    /**
     * @inheritDoc
     */
    public function getChunkLocationMapForDoc(int $docId, string $timeString): array
    {
        // TODO: Implement getChunkLocationMapForDoc() method.
        return [];
    }

    /**
     * @inheritDoc
     */
    public function getChunkLocationMapForChunk(string $workId, int $chunkNumber, string $timeString): array
    {
        // TODO: Implement getChunkLocationMapForChunk() method.
        return [];
    }

    public function getPageInfoByDocSeq(int $docId, int $seq): PageInfo
    {
        // TODO: Implement getPageInfoByDocSeq() method.
        return new PageInfo();
    }

    /**
     * @inheritDoc
     */
    public function getTranscribedPageListByDocId(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER): array
    {
        // TODO: Implement getTranscribedPageListByDocId() method.
        return [];
    }

    public function getPageManager(): PageManager
    {
        // TODO: Implement getPageManager() method.
    }

    public function getErrorMessage(): string
    {
        // TODO: Implement getErrorMessage() method.
        return '';
    }

    public function getErrorCode(): int
    {
        // TODO: Implement getErrorCode() method.
        return 0;
    }

    /**
     * @inheritDoc
     */
    public function getVersionsForLocation(\APM\FullTranscription\ApmItemLocation $location, string $upToTimeString, int $n = 0): array
    {
        // TODO: Implement getVersionsForLocation() method.
        return [];
    }

    /**
     * @inheritDoc
     */
    public function getVersionsForSegmentLocation(\APM\FullTranscription\ApmChunkSegmentLocation $chunkSegmentLocation): array
    {
        // TODO: Implement getVersionsForSegmentLocation() method.
        return [];
    }

    /**
     * @inheritDoc
     */
    public function getVersionsForChunkLocationMap(array $chunkLocationMap): array
    {
        // TODO: Implement getVersionsForChunkLocationMap() method.
        return [];
    }

    public function getLastChunkVersionFromVersionMap(array $versionMap): array
    {
        // TODO: Implement getLastChunkVersionFromVersionMap() method.
        return [];
    }

    public function getDocManager(): \APM\FullTranscription\DocManager
    {
        // TODO: Implement getDocManager() method.
    }

    /**
     * @inheritDoc
     */
    public function getLastSavesForDoc(int $docId, int $numSaves): array
    {
        // TODO: Implement getLastSavesForDoc() method.
        return [];
    }

    /**
     * @inheritDoc
     */
    public function getWitnessesForChunk(string $workId, int $chunkNumber): array
    {
        // TODO: Implement getWitnessesForChunk() method.
        return [];
    }

    /**
     * @inheritDoc
     */
    public function getSegmentLocationsForFullTxWitness(string $workId, int $chunkNumber, int $docId, string $localWitnessId, string $timeString): array
    {
        // TODO: Implement getSegmentLocationsForFullTxWitness() method.
        return [];
    }

    /**
     * @inheritDoc
     */
    public function getFullChunkMap(string $timeString): array
    {
        // TODO: Implement getFullChunkMap() method.
        return [];
    }

    public function getColumnVersionManager(): \APM\FullTranscription\ColumnVersionManager
    {
        // TODO: Implement getColumnVersionManager() method.
    }

    /**
     * @inheritDoc
     */
    public function updatePageSettings(int $pageId, PageInfo $newSettings, int $userId): void
    {
        // TODO: Implement updatePageSettings() method.
    }
}
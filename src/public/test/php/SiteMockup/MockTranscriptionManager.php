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
use APM\FullTranscription\PageManager;
use APM\FullTranscription\TranscriptionManager;

class MockTranscriptionManager extends TranscriptionManager
{

    /**
     * @inheritDoc
     */
    public function getTranscriptionWitness(int $docId, string $workId, int $chunkNumber, string $timeString): ApmTranscriptionWitness
    {
        // TODO: Implement getTranscriptionWitness() method.
    }

    /**
     * @inheritDoc
     */
    public function getChunkLocationMapForDoc(int $docId, string $timeString): array
    {
        // TODO: Implement getChunkLocationMapForDoc() method.
    }

    /**
     * @inheritDoc
     */
    public function getChunkLocationMapForChunk(string $workId, int $chunkNumber, string $timeString): array
    {
        // TODO: Implement getChunkLocationMapForChunk() method.
    }

    public function getPageInfoByDocSeq(int $docId, int $seq): \APM\FullTranscription\PageInfo
    {
        // TODO: Implement getPageInfoByDocSeq() method.
    }

    /**
     * @inheritDoc
     */
    public function getTranscribedPageListByDocId(int $docId, int $order = self::ORDER_BY_PAGE_NUMBER): array
    {
        // TODO: Implement getTranscribedPageListByDocId() method.
    }

    public function getPageManager(): PageManager
    {
        // TODO: Implement getPageManager() method.
    }

    public function getErrorMessage(): string
    {
        // TODO: Implement getErrorMessage() method.
    }

    public function getErrorCode(): int
    {
        // TODO: Implement getErrorCode() method.
    }
}
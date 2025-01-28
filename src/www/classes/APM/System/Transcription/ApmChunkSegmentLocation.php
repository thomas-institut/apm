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

/**
 * Represents the location of a chunk segment in the database:
 *  - the locations of the start and end chunk marks
 *  - an integer status code
  */
class ApmChunkSegmentLocation
{

    private ApmChunkMarkLocation $start;
    private ApmChunkMarkLocation $end;
    private int $status;

    public function __construct()
    {
        $this->status = ChunkSegmentLocationStatus::UNDETERMINED;
        $this->start = new ApmChunkMarkLocation();
        $this->end = new ApmChunkMarkLocation();
    }

    public function setStart(ApmChunkMarkLocation $location) : void {
        $this->start = $location;
    }

    public function setEnd(ApmChunkMarkLocation $location) : void {
        $this->end = $location;
    }

    public function getStart() : ApmChunkMarkLocation {
        return $this->start;
    }
    public function getEnd() : ApmChunkMarkLocation {
        return $this->end;
    }

    public function isValid() : bool  {
        if ($this->status !== ChunkSegmentLocationStatus::UNDETERMINED) {
            return $this->status === ChunkSegmentLocationStatus::VALID;
        }

        $this->status = $this->determineStatus();
        return $this->status === ChunkSegmentLocationStatus::VALID;
    }

    private function determineStatus() : int {
        if ($this->status === ChunkSegmentLocationStatus::DUPLICATE_CHUNK_START_MARKS || $this->status === ChunkSegmentLocationStatus::DUPLICATE_CHUNK_END_MARKS) {
            return $this->status;
        }
        if ($this->start->hasNotBeenSet()){
            return ChunkSegmentLocationStatus::NO_CHUNK_START;
        }

        if ($this->end->hasNotBeenSet()) {
            return ChunkSegmentLocationStatus::NO_CHUNK_END;
        }

        if ($this->start->isAfter($this->end)) {
            return ChunkSegmentLocationStatus::CHUNK_START_AFTER_END;
        }
        return ChunkSegmentLocationStatus::VALID;
    }

    public function getStatus() : int {
        return $this->status;
    }

    public function setDuplicateChunkMarkStatus(bool $isStart): void
    {
        if ($isStart) {
            $this->status = ChunkSegmentLocationStatus::DUPLICATE_CHUNK_START_MARKS;
        } else {
            $this->status = ChunkSegmentLocationStatus::DUPLICATE_CHUNK_END_MARKS;
        }
    }

}
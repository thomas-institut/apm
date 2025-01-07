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
 * Represents the location of chunk segment in the database:
 *   the locations of the start and end chunk marks, and a flag indicating whether the location
 *  is valid
 *
 * @package APM\FullTranscription
 */
class ApmChunkSegmentLocation
{

    const UNDETERMINED = -1;
    const VALID = 0;
    const NO_CHUNK_START = 1;
    const NO_CHUNK_END = 2;
    const CHUNK_START_AFTER_END = 3;
    const DUPLICATE_CHUNK_START_MARKS = 4;
    const DUPLICATE_CHUNK_END_MARKS = 5;

    /**
     * @var ApmChunkMarkLocation
     */
    public $start;

    /**
     * @var ApmChunkMarkLocation
     */
    public $end;
    /**
     * @var int
     */
    private $validityError;

    public function __construct()
    {
        $this->validityError = self::UNDETERMINED;
        $this->start = new ApmChunkMarkLocation();
        $this->end = new ApmChunkMarkLocation();
    }

    public function isValid() : bool  {
        if ($this->validityError !== self::UNDETERMINED) {
            return $this->validityError === 0;
        }

        $this->validityError = $this->determineValidity();
        return $this->validityError === 0;
    }

    private function determineValidity() : int {
        if ($this->validityError === self::DUPLICATE_CHUNK_START_MARKS || $this->validityError === self::DUPLICATE_CHUNK_END_MARKS) {
            return $this->validityError;
        }
        if ($this->start->isZero()){
            return self::NO_CHUNK_START;
        }

        if ($this->end->isZero()) {
            return self::NO_CHUNK_END;
        }

        if ($this->start->isAfter($this->end)) {
            return self::CHUNK_START_AFTER_END;
        }
        return self::VALID;
    }

    public function getChunkError() : int {
        return $this->validityError;
    }

    public function setDuplicateChunkMarkError(bool $isStart) {
        if ($isStart) {
            $this->validityError = self::DUPLICATE_CHUNK_START_MARKS;
        } else {
            $this->validityError = self::DUPLICATE_CHUNK_END_MARKS;
        }

    }

}
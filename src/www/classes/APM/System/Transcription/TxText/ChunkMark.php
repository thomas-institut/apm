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

namespace APM\System\Transcription\TxText;

use InvalidArgumentException;

/**
 * Description of TtiUnclear
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ChunkMark extends Item {
    
    const string CHUNK_START = 'start';
    const string CHUNK_END = 'end';
   
    
    function __construct(int $id, int $seq, string $workId, int $chunkNumber,
                         string $type, string $localId = 'A', int $segment = 1)
    {
        parent::__construct($id, $seq);
        
        $this->type = Item::CHUNK_MARK;
        $this->theText = $workId;
        $this->target = $chunkNumber;
        if ($type !== self::CHUNK_START && $type !== self::CHUNK_END) {
             throw new InvalidArgumentException("Wrong type, must be 'start' "
                     . "or 'end'");
        }
        $this->altText = $type;
        $this->length = $segment;
        $this->extraInfo = $localId;
    }
    
    public function getDareId(): string
    {
        return $this->theText;
    }
    
    function getChunkNumber(): int
    {
        return $this->target;
    }
    
    function getType(): string
    {
        return $this->altText;
    }
    
    function getChunkSegment(): int
    {
        return $this->length;
    }

    function getWitnessLocalId() : string {
        return $this->extraInfo;
    }
}
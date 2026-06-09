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
namespace APM\Core\Item;

/**
 * A chunk mark
 * 
 * The information about type (start/end), work, chunk number and segment is encoded
 * in the mark's text:
 *  <type>-<work>-<chunkNumber>-<segment>
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ChunkMark extends Mark {
    

    const TYPE_START = 'START';
    const TYPE_END = 'END';
    
    public function __construct(string $type, string $work, int $chunkNumber, int $segment = 1) {
        parent::__construct(MarkType::CHUNK);
        $this->setMarkText(implode('-', [$type, $work, $chunkNumber, $segment]));
    }
    
    public function getType() : string {
        return explode('-', $this->getMarkText())[0];
    }
    
    public function getWork() : string {
        return explode('-', $this->getMarkText())[1];
    }
    
    public function getChunkNumber() : int {
        return intVal(explode('-', $this->getMarkText())[2]);
    }
    
    public function getChunkSegment() : int {
        return intVal(explode('-', $this->getMarkText())[3]);
    }

    public function getData(): array
    {
        $data = parent::getData();
        $data['type'] = 'ChunkMark';
        $data['chunkNumber'] = $this->getChunkNumber();
        $data['workId'] = $this->getWork();
        $data['segment'] = $this->getChunkSegment();
        return $data;
    }

}

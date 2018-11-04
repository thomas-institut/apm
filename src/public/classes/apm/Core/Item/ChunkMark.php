<?php

/*
 * Copyright (C) 2018 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace APM\Core\Item;

/**
 * A chunk mark, this deserves its own class!
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ChunkMark extends Mark {
    
    const TYPE_START = 'START';
    const TYPE_END = 'END';
    
    public function __construct(string $type, string $work, int $chunkNumber, int $segment = 1) {
        parent::__construct('__chunkmark');
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
                
}

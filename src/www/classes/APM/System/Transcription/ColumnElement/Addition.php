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

namespace APM\System\Transcription\ColumnElement;

/**
 * Description of Addition
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Addition extends Element {
        
    public string $targetXmlId;
    
    public function __construct($id = Element::ID_NOT_SET, 
            $colNumber = 0, $lang = Element::LANG_NOT_SET)
    {
        parent::__construct($id, $colNumber, $lang);
        $this->type = parent::ADDITION;
        $this->targetXmlId = '';
    }
    
    function getTargetId(): ?int
    {
        return $this->reference;
    }
    
    function setTargetId($id): void
    {
        $this->reference = $id;
    }
}
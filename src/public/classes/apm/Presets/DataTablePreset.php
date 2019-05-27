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

namespace APM\Presets;

/**
 * A preset that also includes a DataTable generated row id 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DataTablePreset extends Preset {
    const NULL_ID = -1;
    
    private $id;
    
    public function __construct(string $tool, int $userId, string $title, array $keys, array $theData, $id = self::NULL_ID) {
        parent::__construct($tool, $userId, $title, $keys, $theData);
        $this->setId($id);
    }
    
    public function getId() : int {
        return $this->id;
    }
    
    public function setId(int $id) {
        $this->id = $id;
    }
}

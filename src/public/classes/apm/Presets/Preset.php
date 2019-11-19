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
 * Basic class that represents a system preset
 * 
 * A preset is essentially some data that is associated with 
 * a system tool, a user and some tool-dependent set of keys
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Preset {
   
    /**
     *
     * @var array 
     */
    private $keyArray;
    
    /**
     *
     * @var array
     */
    private $data;
    
    /**
     *
     * @var int 
     */
    private $userId;
    
    /**
     *
     * @var string 
     */
    private $toolId;
    
    
    /**
     *
     * @var string
     */
    private $title;
    
    public function __construct(string $tool, int $userId, string $title, array $keys, array $theData) {
        $this->toolId = $tool;
        $this->userId = $userId;
        $this->keyArray = $keys;
        $this->data = $theData;
        $this->title = $title;
    }

    /**
     * @return array
     */
    public function getData() : array  {
        return $this->data;
    }

    /**
     * @return string
     */
    public function getTool() : string {
        return $this->toolId;
    }

    /**
     * @param string $key
     * @return bool|mixed
     */
    public function getKey(string $key) {
        if (!isset($this->keyArray[$key])) {
            return false;
        }
        return $this->keyArray[$key];
    }

    /**
     * @return array
     */
    public function getKeyArray() : array {
        return $this->keyArray;
    }

    /**
     * @param string $key
     * @param mixed $value
     */
    public function setKey(string $key, $value) : void {
        $this->keyArray[$key] = $value;
    }

    /**
     * @return int
     */
    public function getUserId() : int {
        return $this->userId;
    }

    /**
     * @return string
     */
    public function getTitle() : string {
        return $this->title;
    }
}

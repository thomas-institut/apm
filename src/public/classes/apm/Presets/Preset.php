<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
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

namespace APM\Presets;

/**
 * Basic class that represents a system preset
 * 
 * A preset is essentially some data that is associated with 
 * a system tool, a user and some tool-dependent set of keys
 * 
 * For example, an automatic collation table preset may use 
 * the work id and the chunk number as keys.
 * 
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
    
    
    public function __construct(string $tool, int $userId, array $keys, array $theData) {
        $this->toolId = $tool;
        $this->userId = $userId;
        $this->keyArray = $keys;
        $this->data = $theData;
    }
    
    public function getData() : array  {
        return $this->data;
    }
    
    public function getTool() : string {
        return $this->toolId;
    }
    
    public function getKey(string $key) {
        if (!isset($this->keyArray[$key])) {
            return false;
        }
        return $this->keyArray[$key];
    }
    
    public function getKeyArray() : array {
        return $this->keyArray;
    }
    
    public function setKey(string $key, $value) {
        $this->keyArray[$key] = $value;
    }
    
    public function getUserId() : int {
        return $this->userId;
    }
}

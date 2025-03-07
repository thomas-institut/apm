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

namespace APM\System\Preset;

use InvalidArgumentException;

/**
 * Basic class that represents a system preset
 * 
 * A system preset is essentially some data (an associative array) that is associated with
 * a system tool (identified by a string id), a user tid and some tool-dependent set of key/values. Additionally,
 * it may have a system-wide integer id.
 *
 * The tool-dependent set of key/values may be used to further identify or classify the preset among the presets associated
 * with that tool.
 *
 * For example, automatic collation table presets (toolId = 'automaticCollation') have an array of witness identifiers
 * as their data and the collation language ('lang') as their key.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Preset {

    const NULL_ID = -1;

    /**
     *
     * @var array 
     */
    private array $keyArray;
    
    /**
     *
     * @var array
     */
    private array $data;
    

    private int $userId;
    
    /**
     *
     * @var string 
     */
    private string $toolId;

    /**
     * @var int
     */
    private int $presetId;
    
    /**
     *
     * @var string
     */
    private string $title;
    
    public function __construct(string $tool, int $userId, string $title, array $keys, array $theData, int $id = self::NULL_ID) {
        $this->toolId = $tool;
        $this->userId = $userId;
        $this->keyArray = $keys;
        $this->data = $theData;
        $this->title = $title;
        $this->setPresetId($id);
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
     * @return mixed
     */
    public function getKey(string $key): mixed
    {
        if (!isset($this->keyArray[$key])) {
            throw new InvalidArgumentException("Key does not exist");
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
    public function setKey(string $key, mixed $value) : void {
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

    /**
     * @return int
     */
    public function getPresetId() : int {
        return $this->presetId;
    }

    /**
     * @param int $presetId
     */
    public function setPresetId(int $presetId): void
    {
        $this->presetId = $presetId;
    }
}

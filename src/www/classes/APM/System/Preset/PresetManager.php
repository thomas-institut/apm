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
 * A class to manage all things related to system presets.
 * 
 * A preset in the system is uniquely identified by the  triplet (tool, userId, title). Functions to search, erase and
 * modify presets use those three values for identification. There is also a unique integer id associated with each preset.
 *
 * Implementations of PresetManager should guarantee that there are no duplicate presets in the system.
 *
 * Presets have an array of string keys associated with them that serve to determine whether they apply to a particular
 * situation within the preset's tool.  For example, automatic collation table presets have a language identifier
 * and a list of witness identifiers as their keys. A user of this class may want to get all presets that
 * have the same language, or that have the same witness identifiers, or both.
 *
 *
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class PresetManager {


    const int ERROR_PRESET_NOT_FOUND = 101;

     // BASIC OPERATIONS

    /**
     * Returns true is the preset associated with the given tool, user tid and title exists
     *
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return bool
     */
    abstract public function presetExists(string $tool, int $userId, string $title) : bool;

    abstract public function presetExistsById(int $id) : bool;

    /**
     * Adds a preset to the system identified with the tool, userId and title in the given Preset.
     * The preset id in the Preset input object is ignored and a new one is assigned.
     *
     * Returns false if there is already a preset with the same tool, userId and title.
     *
     *
     *
     * @param Preset $preset
     * @return bool
     */
    abstract public function addPreset(Preset $preset) : bool;

    /**
     * Erases the preset associated with the given tool, userId and title.
     * Returns true if the preset was erased or not found.
     *
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return bool
     */
    abstract public function erasePreset(string $tool, int $userId, string $title) : bool;

    /**
     * Search methods
     */

    /**
     * Returns the Preset identified by $tool, $userId and $title
     * Throws an exception is the preset is not found
     *
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @throws InvalidArgumentException
     * @return Preset
     */
    abstract public function getPreset(string $tool, int $userId, string $title) : Preset;

    /**
     * Returns an array containing all the Preset objects in the system that match
     * the given $tool and $keysToMatch.
     *
     * @param string $tool
     * @param array $keysToMatch
     * @return Preset[]
     */
    abstract public function getPresetsByToolAndKeys(string $tool, array $keysToMatch) : array;

    /**
     * @param string $tool
     * @param int $userTid
     * @param array $keysToMatch
     * @return Preset[]
     */
    abstract public function getPresetsByToolUserIdAndKeys(string $tool, int $userTid, array $keysToMatch) : array;

    /**
     * Returns the preset with the given $id.
     * Throws an InvalidArgumentException if there's no such preset.
     *
     * @param int $id
     * @return Preset
     */
    abstract public function getPresetById(int $id) : Preset;

    
    /**
     * BASIC OPERATIONS (Alternative versions)
     */
    
    /**
     * Returns true if the preset with the same tool, userId and title as the
     * given $preset exists in the system
     * 
     * @param Preset $preset
     * @return bool
     */
    public function correspondingPresetExists(Preset $preset) : bool {
        return $this->presetExists($preset->getTool(), $preset->getUserId(), $preset->getTitle());
    }
    
    /**
     * Erases the preset with the same tool, userId and title as the given $preset
     * 
     * @param Preset $preset
     * @return bool
     */
    public function eraseCorrespondingPreset(Preset $preset) : bool {
        return $this->erasePreset($preset->getTool(), $preset->getUserId(), $preset->getTitle());
    }
   
    /**
     * PROTECTED METHODS
     */
 
    /**
     * Returns true is $presetKeyArray matches $keysToMatch  
     * 
     * $presetKeyArray matches $keysToMatch if all elements in $keysToMatch 
     * exist and have the same value independently of the value of all other 
     * keys not in $keysToMatch.
     * 
     * This means, for example, that any $presetKeyArray matches an empty $keysToMatch
     * 
     * @param array $presetKeyArray
     * @param array $keysToMatch
     * @return bool
     */
    protected function match(array $presetKeyArray, array $keysToMatch) : bool {
        foreach($keysToMatch as $key => $value) {
            if (!isset($presetKeyArray[$key])) {
                return false;
            }
            if ($presetKeyArray[$key] !== $value) {
                return false;
            }
        }
        return true;
    }

    protected function newPresetNotFoundException() : InvalidArgumentException {
        return  new InvalidArgumentException('Preset not found', self::ERROR_PRESET_NOT_FOUND);
    }
    
}

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

use InvalidArgumentException;

/**
 * A class to manage all things related to system presets.
 * 
 * A preset in the system is uniquely identified by the 
 * triplet (tool, userId, title).  Implementations of PresetManager should 
 * guarantee that presets are not duplicate in the system.
 *
 * Each preset has also a unique Id associated with it.
 * 
 * Functions to search, erase and modify presets use those three values for 
 * identification. The abstract class provides alternative versions of those 
 * functions that take those values from a Preset object. 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class PresetManager {


     // BASIC OPERATIONS

    /**
     * Returns true is the preset associated with the given tool, user Id and title exists
     *
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return bool
     */
    abstract public function presetExists(string $tool, int $userId, string $title) : bool;

    /**
     * addPreset must return false if there is already a preset
     * that corresponds to the given $preset.
     *
     * @param Preset $preset
     * @return bool
     */
    abstract public function addPreset(Preset $preset) : bool;

    /**
     * erasePreset must return true if the preset was erased or if it did not exist
     * in the first place
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
     * @param string $tool
     * @param array $keysToMatch
     * @return Preset[]
     */
    abstract public function getPresetsByToolAndKeys(string $tool, array $keysToMatch) : array;

    /**
     * @param string $tool
     * @param int $userId
     * @param array $keysToMatch
     * @return Preset[]
     */
    abstract public function getPresetsByToolUserIdAndKeys(string $tool, int $userId, array $keysToMatch) : array;

    /**
     * @param int $id
     * @return Preset
     */
    abstract public function getPresetById(int $id);

    
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
        return  new InvalidArgumentException('Preset not found');
    }
    
}

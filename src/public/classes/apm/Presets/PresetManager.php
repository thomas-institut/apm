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
 * A class to manage all things related to system presets
 * 
 * Implementations of PresetManager should guarantee that preset are not
 * duplicate. A preset is uniquely identified by the combination 
 * of tool, userId and title, so, functions to search, erase and modify
 * presets use those three values for identification. The abstract
 * class provides alternative versions of those functions that take those
 * values from a Preset object. 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class PresetManager {
    
    /**
     * Basic operations with presets
     */
    abstract public function presetExists(string $tool, int $userId, string $title) : bool;
    abstract public function addPreset(Preset $preset) : bool;
    abstract public function erasePreset(string $tool, int $userId, string $title) : bool;

    /**
     * Search methods
     */
    
    /** getPreset returns false is the preset does not exist */
    abstract public function getPreset(string $tool, int $userId, string $title);
    abstract public function getPresetsByToolAndKeys(string $tool, array $keysToMatch) : array;
    abstract public function getPresetsByToolUserIdAndKeys(string $tool, int $userId, array $keysToMatch) : array;

    
    /**
     * Alternative versions of the basic operations with corresponding preset
     */
    
    /**
     * Returns true if the preset with the same tool, userId and title as the
     * given $preset exists in the system
     * 
     * @param \APM\Presets\Preset $preset
     * @return bool
     */
    public function correspondingPresetExists(Preset $preset) : bool {
        return $this->presetExists($preset->getTool(), $preset->getUserId(), $preset->getTitle());
    }
    
    /**
     * Erases the preset with the same tool, userId and title as the given $preset
     * 
     * @param \APM\Presets\Preset $preset
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
    
}

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
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class PresetManager {
    
    abstract public function addPreset(Preset $preset) : bool;
    abstract public function erasePreset(Preset $preset) : bool;
    
    /**
     * Returns an array with all the presets associated with the given $tool
     * whose keys match the given $keysToMatch array
     */
    abstract public function getPresetsByToolAndKeys(string $tool, array $keysToMatch) : array;
    
    /**
     * Returns an array with all the presets associated with the given $tool and $userId
     * whose keys match the given $keysToMatch array
     */
    abstract public function getPresetsByToolUserIdAndKeys(string $tool, int $userId, array $keysToMatch) : array;
    
 
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

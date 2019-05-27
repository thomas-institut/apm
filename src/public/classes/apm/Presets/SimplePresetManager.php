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
 * A Preset Manager implemented with an internal array containing all
 * presets by tool id
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SimplePresetManager extends PresetManager {
    
    private $presets;
    
    /**
     * Constructs an empty preset manager
     */
    public function __construct() {
        $this->presets = [];
    }
    
    /**
     * Adds a preset to the system.
     * 
     * Returns false if there is a preset in the system
     * with the same tool, userid and title as the
     * givel $preset
     * 
     * @param \APM\Presets\Preset $preset
     * @return bool
     */
    public function addPreset(Preset $preset): bool {
        if ($this->correspondingPresetExists($preset)) {
            return false;
        }
        
        if (!isset($this->presets[$preset->getTool()])) {
            $this->presets[$preset->getTool()] = [];
        }
        $this->presets[$preset->getTool()][] = clone $preset;
        return true;
    }

    /**
     * Erases the preset identified by $tool, $userId and $title
     * 
     * Returns true if the preset was successfully erased from the 
     * system or if it did not exist in the first place.
     * 
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return bool
     */
    public function erasePreset(string $tool, int $userId, string $title): bool {

        $index = $this->getPresetIndex($tool, $userId, $title);
        if ($index === false) {
            return true;
        }
        
        array_splice($this->presets[$tool], $index, 1);
        return true;
    }

    /**
     * Returns an array containing all the Preset objects in the system
     * that match the given $tool and $keysToMatch
     * 
     * @param string $tool
     * @param array $keysToMatch
     * @return array
     */
    public function getPresetsByToolAndKeys(string $tool, array $keysToMatch): array {
        if (!isset($this->presets[$tool])) {
            return [];
        }
        
        $matchedPresets = [];
        
        foreach($this->presets[$tool] as $preset) {
            if ($this->match($preset->getKeyArray(), $keysToMatch)) {
                $matchedPresets[] = $preset;
            }
        }
        return $matchedPresets;
    }

    /**
     * Returns an array containing all the Preset objects in the system
     * that match the given $tool, $userId and $keysToMatch
     * 
     * @param string $tool
     * @param int $userId
     * @param array $keysToMatch
     * @return array
     */
    public function getPresetsByToolUserIdAndKeys(string $tool, int $userId, array $keysToMatch): array {
        $matchedPresets = [];
        $presets = $this->getPresetsByToolAndKeys($tool, $keysToMatch);
        foreach ($presets as $preset) {
            if ($preset->getUserId() === $userId) {
                $matchedPresets[] = $preset;
            }
        }
        return $matchedPresets;
    }

    /**
     * Returns the Preset identified by $tool, $userId and $title or
     * false if there's no such preset in the system.
     * 
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return boolean
     */
    public function getPreset(string $tool, int $userId, string $title) {
        $index = $this->getPresetIndex($tool, $userId, $title);
        if ($index === false) {
            return false;
        }
        return $this->presets[$tool][$index];
    }
    
    /**
     * Returns true if the preset identified by $too, $userId and $title
     * exists in the system
     * 
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return bool
     */
    public function presetExists(string $tool, int $userId, string $title): bool {
        return $this->getPresetIndex($tool, $userId, $title) !== false;
    }
    
    
    /**
     * Returns the index in the internal array for the given $tool that
     * contains the preset identified by $tool, $userId and $title.
     * If there's no such preset, returns false.
     * 
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return boolean
     */
    private function getPresetIndex(string $tool, int $userId, string $title) {
         if (!isset($this->presets[$tool])) {
            return false;
        }
        foreach($this->presets[$tool] as $i => $preset) {
            if ($preset->getTitle() === $title && $preset->getUserId() === $userId) {
                return $i;
            }
        }
        return false;
    }

}

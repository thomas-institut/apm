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
 * A Preset Manager implemented with an internal array containing all
 * presets by tool id
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SimplePresetManager extends PresetManager {
    
    private $presets;
    
    public function __construct() {
        $this->presets = [];
    }
    
    public function addPreset(Preset $preset): bool {
        if (!isset($this->presets[$preset->getTool()])) {
            $this->presets[$preset->getTool()] = [];
        }
        $this->presets[$preset->getTool()][] = clone $preset;
        return true;
    }

    public function erasePreset(string $tool, int $userId, string $title): bool {

        $index = $this->getPresetIndex($tool, $userId, $title);
        if ($index === false) {
            return false;
        }
        
        array_splice($this->presets[$tool], $index, 1);
        return true;
    }

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

    public function getPreset(string $tool, int $userId, string $title) {
        $index = $this->getPresetIndex($tool, $userId, $title);
        if ($index === false) {
            return false;
        }
        return $this->presets[$tool][$index];
    }

    public function presetExists(string $tool, int $userId, string $title): bool {
        return $this->getPresetIndex($tool, $userId, $title) !== false;
    }
    
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

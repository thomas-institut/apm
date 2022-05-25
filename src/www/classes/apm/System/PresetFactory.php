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

namespace APM\System;

use APM\Presets\Preset;
/**
 * Handles the creation of different kinds of presets
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PresetFactory {
    
    public function create($toolId, int $userId, string $title, array $theData) {
        
        if ($toolId === SystemManager::TOOL_AUTOMATIC_COLLATION) {
                return new Preset(
                        SystemManager::TOOL_AUTOMATIC_COLLATION,
                        $userId, 
                        $title, 
                        ['lang' => $theData['lang'], 'witnesses' => $theData['witnesses']], 
                        $theData
                );
        }
        
        return new Preset($toolId, $userId, $title, $theData, $theData);
    }
    
}
<?php

/*
 * Copyright (C) 2018 Universität zu Köln
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

namespace APM;

require "../vendor/autoload.php";
require_once 'PresetManagerTest.php';

use PHPUnit\Framework\TestCase;
use APM\Presets\SimplePresetManager;


/**
 * SimplePresetManager test
 * 
 * For now only, the standard test for PresetManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SimplePresetManagerTest extends PresetManagerTest {
    
    public function createEmptyPresetManager(): Presets\PresetManager {
        return new SimplePresetManager();
    }

}

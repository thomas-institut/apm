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

use PHPUnit\Framework\TestCase;
use APM\Presets\PresetManager;
use APM\Presets\Preset;

/**
 * Abstract class with tests that all PresetManager implementations should pass
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class PresetManagerTest extends TestCase {
    
    abstract public function createEmptyPresetManager() : PresetManager;
    
    public function testSimple() {
        $testTool01 = 'tool1';
        $testTool02 = 'tool2';
        $testTool03 = 'tool3';
        $testUserId01 = 1000;
        $testUserId02 = 1001;
        $testKeys = [ 'key1' => 'k1v1', 'key2' => 'k2v1'];
        $testData = [ 'field1' => 'some value'];
        
        $pm = $this->createEmptyPresetManager();

        $this->assertCount(0, $pm->getPresetsByToolAndKeys('any', []));
        $this->assertCount(0, $pm->getPresetsByToolUserIdAndKeys('any', -1, []));
        
        $pr1 = new Preset($testTool01, $testUserId01, $testKeys, $testData);
        $pr2 = new Preset($testTool01, $testUserId02, $testKeys, $testData);
        
        
        
        
        $this->assertTrue($pm->addPreset($pr1));
        $this->assertTrue($pm->addPreset($pr2));
        
        $this->assertCount(0, $pm->getPresetsByToolAndKeys('any', []));
        $this->assertCount(0, $pm->getPresetsByToolUserIdAndKeys('any', -1, []));
        $this->assertCount(2, $pm->getPresetsByToolAndKeys($testTool01, []));
        $this->assertCount(1, $pm->getPresetsByToolUserIdAndKeys($testTool01, $testUserId01, []));
        $this->assertCount(1, $pm->getPresetsByToolUserIdAndKeys($testTool01, $testUserId02, []));
        
        // Erasing tests
        $nonExistentPreset1 = new Preset($testTool03, $testUserId02, $testKeys, $testData);  // non existent tool
        $nonExistentPreset2 = new Preset($testTool01, $testUserId02 + 1000, $testKeys, $testData); // non existent user Id
        $nonExistentPreset3 = new Preset($testTool01, $testUserId01, [ 'somekey' => 'value'], $testData); // non existent keys
        $nonExistentPreset4 = new Preset($testTool01, $testUserId01, $testKeys, [ 'nonexistent data']); // non existent data
        
        $this->assertFalse($pm->erasePreset($nonExistentPreset1));
        $this->assertFalse($pm->erasePreset($nonExistentPreset2));
        $this->assertFalse($pm->erasePreset($nonExistentPreset3));
        $this->assertFalse($pm->erasePreset($nonExistentPreset4));
        
        $this->assertTrue($pm->erasePreset($pr2));
        $this->assertCount(1, $pm->getPresetsByToolAndKeys($testTool01, []));
        $this->assertTrue($pm->erasePreset($pr1));
        $this->assertCount(0, $pm->getPresetsByToolAndKeys($testTool01, []));
    }
    
    public function testKeyMatching() {
        $tool = 'tool';
        $userId = 1000;
        $testKeyArray01 = [ 'k1' => 'v1', 'k2' => 'v2', 'k3' => 'v3'];
        $data = [ 'some string'];
        
        $pr = new Preset($tool, $userId, $testKeyArray01, $data);
        $pm = $this->createEmptyPresetManager();
        $pm->addPreset($pr);
        
        $this->assertCount(0, $pm->getPresetsByToolAndKeys($tool, ['nonexistentkey' => 'some other value']));
        $this->assertCount(1, $pm->getPresetsByToolAndKeys($tool, []));
        $this->assertCount(1, $pm->getPresetsByToolAndKeys($tool, ['k1' => 'v1']));
        $this->assertCount(0, $pm->getPresetsByToolAndKeys($tool, ['k1' => 'some other value']));
        $this->assertCount(1, $pm->getPresetsByToolAndKeys($tool, ['k2' => 'v2']));
        $this->assertCount(0, $pm->getPresetsByToolAndKeys($tool, ['k2' => 'some other value']));
        

    }
    
    
}

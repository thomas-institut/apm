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
use APM\Presets\DataTablePresetManager;
use DataTable\InMemoryDataTable;


/**
 * SimplePresetManager test
 * 
 * For now only, the standard test for PresetManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DataTablePresetManagerTest extends PresetManagerTest {
    
    public function createEmptyPresetManager(): Presets\PresetManager {
        $dt = new InMemoryDataTable();
        return new DataTablePresetManager($dt);
    }
    
    protected function createPM($expandedKeys = []) {
        $dt = new InMemoryDataTable();
        return new DataTablePresetManager($dt, $expandedKeys);
    }
    
    public function testExpandedKeys() {
        
        $pms = [];
        $pms[] = $this->createPM();
        $pms[] = $this->createPM(['key1' => 'field1']);
        $pms[] = $this->createPM(['key2' => 'field1']);
        $pms[] = $this->createPM(['key1' => 'field1', 'key2' => 'field2']);

        $toolName = 'mytool';
        $userId = 1000;
        $key1ValueToFind = 'myKey1Value';
        $key2ValueToFind = 'myKey2Value';
        $presetsWithOnlyKey1 = 25;
        $presetsWithOnlyKey2 = 25;
        $presetsWithKey1AndKey2 = 5;
        $otherPresets = 100;
        
        $presetArray = [];
        for ($i = 0; $i < $presetsWithOnlyKey1; $i++) {
            $presetArray[] = new Presets\Preset(
                    $toolName, $userId, 'preset-key1-' . $i, 
                    [ 'key1' => $key1ValueToFind, 'key2' => 'some-value-' . $i, 'key3' => 'key3v' . $i],
                    [ 'info' => 'preset-info-k1']);
        }
        for ($i = 0; $i < $presetsWithOnlyKey2; $i++) {
            $presetArray[] = new Presets\Preset(
                    $toolName, $userId, 'preset-key2-' . $i, 
                    [ 'key2' => $key2ValueToFind, 'key1' => 'some-value-' . $i, 'key3' => 'key3v' . $i],
                    [ 'info' => 'preset-info-k2']);
        }
        
        for ($i = 0; $i < $presetsWithKey1AndKey2; $i++) {
            $presetArray[] = new Presets\Preset(
                    $toolName, $userId, 'preset-key1and2-' . $i, 
                    [ 'key1' => $key1ValueToFind, 'key2' => $key2ValueToFind, 'key3' => 'key3v' . $i],
                    [ 'info' => 'preset-info-k1andk2']);
        }
        
        for ($i = 0; $i < $otherPresets; $i++) {
            $presetArray[] = new Presets\Preset(
                    $toolName, $userId + 1, 'preset-other-' . $i, 
                    [ 'key1' => 'not-' . $key2ValueToFind, 'key2' => 'not-' . $key2ValueToFind, 'key3' => 'key3v' . $i],
                    [ 'info' => 'preset-info-other']);
        }
        
        shuffle($presetArray);
        
        foreach($presetArray as $preset) {
            foreach($pms as $pm) {
                $this->assertTrue($pm->addPreset($preset));    
            }
        }
        foreach($pms as $pm) {
            $k1presets = $pm->getPresetsByToolAndKeys($toolName, [ 'key1' => $key1ValueToFind]);
            $this->assertCount($presetsWithOnlyKey1 + $presetsWithKey1AndKey2, $k1presets);
            foreach($k1presets as $preset) {
                $info = $preset->getData()['info'];
                $this->assertTrue($info === 'preset-info-k1' || $info === 'preset-info-k1andk2');
            }
            
            $k1presets2 = $pm->getPresetsByToolUserIdAndKeys($toolName, $userId, [ 'key1' => $key1ValueToFind]);
            $this->assertCount($presetsWithOnlyKey1 + $presetsWithKey1AndKey2, $k1presets2);
            foreach($k1presets2 as $preset) {
                $info = $preset->getData()['info'];
                $this->assertTrue($info === 'preset-info-k1' || $info === 'preset-info-k1andk2');
            }
            
            $k2presets = $pm->getPresetsByToolAndKeys($toolName, [ 'key2' => $key2ValueToFind]);
            $this->assertCount($presetsWithOnlyKey2 + $presetsWithKey1AndKey2, $k2presets);
            foreach($k2presets as $preset) {
                $info = $preset->getData()['info'];
                $this->assertTrue($info === 'preset-info-k2' || $info === 'preset-info-k1andk2');
            }
        
            $k1and2presets = $pm->getPresetsByToolAndKeys($toolName, [ 'key1' => $key1ValueToFind, 'key2' => $key2ValueToFind]);
            $this->assertCount($presetsWithKey1AndKey2, $k1and2presets);
            foreach($k1and2presets as $preset) {
                $info = $preset->getData()['info'];
                $this->assertTrue($info === 'preset-info-k1andk2');
            }
        }
        
    }

}

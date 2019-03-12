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
use APM\Presets\Preset;

/**
 * Description of VectorTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PresetTest extends TestCase {
    
    public function testSimple() {
        
        $userId = 1000;
        $toolId = 'mytool';
        $title = 'mytitle';
        $keyName = 'mykey';
        $testKeyValue = 'my value';
        $testData = [ 'field1' => 100, 'field2' => 'some string'];
        $keyName2 = 'someotherKey';
        $testKeyValue2 = 'my value 2';
        
        $pr = new Preset($toolId, $userId, $title, [ $keyName => $testKeyValue], $testData);
        $this->assertEquals($toolId, $pr->getTool());
        $this->assertEquals($userId, $pr->getUserId());
        $this->assertEquals($title, $pr->getTitle());
        $this->assertFalse($pr->getKey($keyName . 'asdf'));
        
        $this->assertEquals($testData, $pr->getData());
        $this->assertEquals($testKeyValue, $pr->getKey($keyName));
        $pr->setKey($keyName2, $testKeyValue2);
        $this->assertEquals($testKeyValue2, $pr->getKey($keyName2));
        $this->assertCount(2, $pr->getKeyArray());
        
    }
    
    
}

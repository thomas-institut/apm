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

namespace APM;

require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;
use APM\Presets\Preset;
use APM\System\PresetFactory;

/**
 * Description of VectorTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PresetFactoryTest extends TestCase {
    
    public function testSimple() {
        
       $factory = new PresetFactory();
       
       $someData = ['field1' => 'data1'];
       
       $preset1 = $factory->create('someTool', 100, 'preset1', $someData);
       
       $this->assertEquals($someData, $preset1->getData());
       $this->assertEquals('someTool', $preset1->getTool());
       
       $myData = [ 'lang' => 'la', 'witnesses' => [1, 2]];
       $preset2 = $factory->create(System\ApmSystemManager::TOOL_AUTOMATIC_COLLATION, 100, 'myactpreset', $myData);
       
       $this->assertEquals($myData, $preset2->getData());
       $this->assertEquals('la', $preset2->getKey('lang'));
       
        
    }
    
    
}

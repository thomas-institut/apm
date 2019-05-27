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
use APM\Plugin\HookManager;

/**
 * Description of SettingsManagerTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class HookManagerTest extends TestCase {
    
    
    public static function someFunction($p) 
    {
        return $p + 1;
    }
    
    public function testBasic() 
    {
        
        $hm = new HookManager();
        
        $this->assertCount(0, $hm->getDefinedHooks());
        
        $result5 = $hm->attachToHook('test', 'Someclass::inexistentFunction');
        $this->assertFalse($result5);
        
        $someVar = 0;
        $result = $hm->attachToHook('test', function($p1) use (&$someVar) { $someVar += $p1; return $someVar;});
        $this->assertTrue($result);
        
        $hm->callHookedMethods('test', 1);
        $this->assertEquals(1, $someVar);
        
        $someVar = 0;
        $result2 = $hm->attachToHook('test', function($p1) use (&$someVar) { $someVar += $p1; return $someVar;});
        $this->assertTrue($result2);
        $hm->callHookedMethods('test', 5, false);
        $this->assertEquals(10, $someVar);
        $someVar = 0;
        $hmResult = $hm->callHookedMethods('test', 5);
        $this->assertEquals(10, $someVar);
        $this->assertEquals(10, $hmResult);
        
        
        $result3 = $hm->attachToHook('test2', function($p1)  { return $p1 + 1;});
        $this->assertTrue($result3);
        
        $result4 = $hm->attachToHook('test2', 'APM\HookManagerTest::someFunction');
        $this->assertTrue($result4);
        $hmResult2 = $hm->callHookedMethods('test2', 0);
        $this->assertEquals(2, $hmResult2);
        
    }
    
    
}

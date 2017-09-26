<?php
/*
 *  Copyright (C) 2017 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject;

require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;
use AverroesProject\Data\SettingsManager;
use AverroesProject\Plugin\PluginManager;

/**
 * Description of SettingsManagerTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PluginManagerTest extends TestCase {
    
    public function testBasic() 
    {
        $sm = new SettingsManager();
        $pm = new PluginManager($sm, ['./test-plugins/basic']);
        
        $this->assertCount(1, $pm->pluginDirs);
        
        $result = $pm->addPluginDir('./test-plugins/baddir');
        $this->assertFalse($result);
        $this->assertEquals(PluginManager::PM_ERROR_INVALID_DIR, $pm->error);
        $this->assertCount(1, $pm->pluginDirs);
        
        $result2 = $pm->addPluginDir('./test-plugins/basic2');
        $this->assertTrue($result2);
        $this->assertEquals(PluginManager::PM_ERROR_NO_ERROR, $pm->error);
        $this->assertCount(2, $pm->pluginDirs);
        
        $result3 = $pm->loadActivePlugins();
        $this->assertTrue($result3);
        $this->assertEquals(PluginManager::PM_ERROR_NO_ERROR, $pm->error);
        
        $pc = $pm->getPluginClasses();
        $this->assertCount(0, $pc);
    }
    
    public function testLoadDirs()
    {
        $sm = new SettingsManager();
        $pm = new PluginManager($sm, ['./test-plugins/basic']);
        
        $result = $pm->loadPluginDir('./test-plugins/basic');
        $this->assertTrue($result);
        $pc = $pm->getPluginClasses();
        $this->assertCount(1, $pc);
        $this->assertEquals('BasicPlugin', $pc[0]);
    }
}

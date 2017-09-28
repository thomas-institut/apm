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
use AverroesProject\Plugin\HookManager;
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
        $hm = new HookManager();
        $pm = new PluginManager($sm, $hm, ['./test-plugins/basic']);
        
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
        $hm = new HookManager();
        $pm = new PluginManager($sm, $hm, ['./test-plugins/basic']);
        
        $result = $pm->loadPluginDir('./test-plugins/basic');
        $this->assertTrue($result);
        $pc = $pm->getPluginClasses();
        $this->assertCount(1, $pc);
        $this->assertEquals('BasicPlugin', $pc[0]);
        
        
        $result2 = $pm->loadPluginDir('./test-plugins/basic2', 'BadClass');
        $this->assertFalse($result2);
        
        $result3 = $pm->loadPluginDir('./test-plugins/basic2', 'BasicPlugin2');
        $this->assertTrue($result3);
        $pc2 = $pm->getPluginClasses();
        $this->assertCount(2, $pc2);
        $this->assertEquals('BasicPlugin2', $pc2[1]);
    }
    
    public function testActivate()
    {
        $sm = new SettingsManager();
        $hm = new HookManager();
        $pm = new PluginManager($sm, $hm);
        
        $badClassR = $pm->activatePlugin('./test-plugins/basic', 'BadClass');
        $this->assertFalse($badClassR);
        
        $result = $pm->activatePlugin('./test-plugins/basic', 'BasicPlugin');
        $this->assertTrue($result);
        
        $this->assertCount(1, $pm->pluginObjects);
        $basicPluginObject = $pm->pluginObjects[0];
        $this->assertTrue(is_a($basicPluginObject, 'BasicPlugin'));
        $this->assertEquals(0, $basicPluginObject->myVar);
        $hm->callHookedMethods(\BasicPlugin::BP_HOOK_NAME, 1);
        $this->assertEquals(1, $basicPluginObject->myVar);
        $hm->callHookedMethods(\BasicPlugin::BP_HOOK_NAME, 5);
        $this->assertEquals(6, $basicPluginObject->myVar);
        
        // Activate again, nothing should happen
        $result2 = $pm->activatePlugin('./test-plugins/basic', 'BasicPlugin');
        $this->assertTrue($result2);
        $this->assertCount(1, $pm->pluginObjects);
        $this->assertEquals(6, $basicPluginObject->myVar);
        
        $result3 = $pm->deactivatePlugin('./test-plugins/basic', 'BasicPlugin');
        $this->assertTrue($result3);
        $this->assertEquals([], $pm->getActivePluginArray());
        $this->assertEquals(-1000, $basicPluginObject->myVar);
        
    }
    
    public function testActivePluginSetting()
    {
        $sm = new SettingsManager();
        $hm = new HookManager();
        $pm = new PluginManager($sm, $hm);
        
        $result = $pm->getActivePluginArray();
        $this->assertEquals([], $result);
        $sm->setSetting(PluginManager::PM_ACTIVE_PLUGINS_SETTING, 'somestring');
        $result2 = $pm->getActivePluginArray();
        $this->assertFalse($result2);
        $this->assertEquals(PluginManager::PM_ERROR_BAD_SETTING, $pm->error);
        
        // not an array
        $sm->setSetting(PluginManager::PM_ACTIVE_PLUGINS_SETTING, json_encode(25));
        $result3 = $pm->getActivePluginArray();
        $this->assertFalse($result3);
        $this->assertEquals(PluginManager::PM_ERROR_BAD_SETTING, $pm->error);
        
        // bad array
        $badActPluginArray = [];
        $badActPluginArray[] = ['x' => 'somestring'];
        $sm->setSetting(PluginManager::PM_ACTIVE_PLUGINS_SETTING, 
                json_encode($badActPluginArray));
        $result4 = $pm->getActivePluginArray();
        $this->assertFalse($result4);
        $this->assertEquals(PluginManager::PM_ERROR_BAD_SETTING, $pm->error);
        
        // bad array 2
        $badActPluginArray2 = [];
        $badActPluginArray2[] = ['dir' => 'somedir', 'class' => 'someclass'];
        $badActPluginArray2[] = ['dir' => 'somedir2']; // <-- missing 'class'
        $sm->setSetting(PluginManager::PM_ACTIVE_PLUGINS_SETTING, 
                json_encode($badActPluginArray2));
        $result5 = $pm->getActivePluginArray();
        $this->assertFalse($result5);
        $this->assertEquals(PluginManager::PM_ERROR_BAD_SETTING, $pm->error);
        
        
        // Good array!
        $goodArray = [];
        $goodArray[] = ['dir' => 'somedir', 'class' => 'someclass'];
        $sm->setSetting(PluginManager::PM_ACTIVE_PLUGINS_SETTING, 
                json_encode($goodArray));
        $result6 = $pm->getActivePluginArray();
        $this->assertNotFalse($result6);
        $this->assertEquals(PluginManager::PM_ERROR_NO_ERROR, $pm->error);
    }
    
    public function testLoadActivePlugins()
    {
        $sm = new SettingsManager();
        $hm = new HookManager();
        $pm = new PluginManager($sm, $hm);
        
        $badPlugins = [];
        $badPlugins[] = ['dir' => 'somedir', 'class' => 'randomClassXYZ'];
        $sm->setSetting(PluginManager::PM_ACTIVE_PLUGINS_SETTING, 
                json_encode($badPlugins));
        
        $result = $pm->loadActivePlugins();
        $this->assertFalse($result);
        $this->assertEquals(PluginManager::PM_ERROR_CANNOT_LOAD_PLUGIN, $pm->error);
        $this->assertEquals([], $pm->getActivePluginArray());
        
        $badPlugins2 = [];
        $badPlugins2[] = ['dir' => 'somedir', 'class' => 'randomClassXYZ']; // <-- this is bad
        $badPlugins2[] = ['dir' => './test-plugins/basic', 'class' => 'BasicPlugin']; // <-- this is good
        $sm->setSetting(PluginManager::PM_ACTIVE_PLUGINS_SETTING, 
                json_encode($badPlugins2));
        
        $result2 = $pm->loadActivePlugins();
        $this->assertFalse($result2);
        $this->assertEquals(PluginManager::PM_ERROR_CANNOT_LOAD_PLUGIN, $pm->error);
        $this->assertCount(1, $pm->getActivePluginArray());
        $this->assertCount(1, $pm->pluginObjects);
        $basicPluginObject = $pm->pluginObjects[0];
        $this->assertTrue(is_a($basicPluginObject, 'BasicPlugin'));
        $this->assertEquals(0, $basicPluginObject->myVar);
        $hm->callHookedMethods(\BasicPlugin::BP_HOOK_NAME, 1);
        $this->assertEquals(1, $basicPluginObject->myVar);
        
        // re-loading should not have any effect at this point
        $result3 = $pm->loadActivePlugins();
        $this->assertTrue($result3);
        $this->assertCount(1, $pm->pluginObjects);
        $this->assertEquals(1, $basicPluginObject->myVar);
    }
}

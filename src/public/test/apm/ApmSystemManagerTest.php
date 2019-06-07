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

use APM\System\ApmSystemManager;


class ApmSystemManagerTest extends TestCase {
 
    
    public function testBadConfigs() {
        
        // Empty configuration
        $sm1 = new ApmSystemManager([]);
        $this->assertTrue($sm1->fatalErrorOccurred());
        $this->assertEquals(ApmSystemManager::ERROR_CONFIG_ARRAY_IS_NOT_VALID, $sm1->getErrorCode());
        
        // Missing values
        $config = [];
        foreach(ApmSystemManager::REQUIRED_CONFIG_VARIABLES as $reqVariable) {
            $config[$reqVariable] = 'somevalue';
        }
        $sm2 = new ApmSystemManager($config);
        $this->assertTrue($sm2->fatalErrorOccurred());
        $this->assertEquals(ApmSystemManager::ERROR_CONFIG_ARRAY_IS_NOT_VALID, $sm2->getErrorCode());  
        
        // Set proper logging for testing environment
        $config[ApmSystemManager::CFG_LOG_FILENAME] = 'test.log';
        $config[ApmSystemManager::CFG_LOG_IN_PHP_ERROR_HANDLER] = false;
        $config[ApmSystemManager::CFG_LOG_DEBUG] = true;

        // non-string database parameters
        
        $config[ApmSystemManager::CFG_DB] = [];
        $config[ApmSystemManager::CFG_DB]['host'] = 3;
        $config[ApmSystemManager::CFG_DB]['db'] = 3;
        $config[ApmSystemManager::CFG_DB]['user'] = 3;
        $config[ApmSystemManager::CFG_DB]['pwd'] = 3;
        $sm3 = new ApmSystemManager($config);
        $this->assertTrue($sm3->fatalErrorOccurred());
        $this->assertEquals(ApmSystemManager::ERROR_CONFIG_ARRAY_IS_NOT_VALID, $sm3->getErrorCode());
        
        
        // Bad DB parameters
        $config[ApmSystemManager::CFG_DB]['host'] = 'somehost';
        $config[ApmSystemManager::CFG_DB]['db'] = 'somedb';
        $config[ApmSystemManager::CFG_DB]['user'] = 'baduser';
        $config[ApmSystemManager::CFG_DB]['pwd'] = 'badpasswd';
        $sm4 = new ApmSystemManager($config);
        $this->assertTrue($sm4->fatalErrorOccurred());
        $this->assertEquals(ApmSystemManager::ERROR_DATABASE_CONNECTION_FAILED, $sm4->getErrorCode());
        
        // Fix DB parameters
        if ( (include 'apm/SiteMockup/testconfig.php') === false) {
            print "Can't include testconfig file\n";
        }
        $config[ApmSystemManager::CFG_DB]['host'] = $apmTestConfig['db']['host'];
        $config[ApmSystemManager::CFG_DB]['db'] = $apmTestConfig['db']['db'];
        $config[ApmSystemManager::CFG_DB]['user'] = $apmTestConfig['db']['user'];
        $config[ApmSystemManager::CFG_DB]['pwd'] = $apmTestConfig['db']['pwd'];
        
        // Bad prefix: results in system manager reporting a badly configured database
        $config[ApmSystemManager::CFG_TABLE_PREFIX] = 'bad_prefix';
        $sm5 = new ApmSystemManager($config);
        $this->assertTrue($sm5->fatalErrorOccurred());
        $this->assertEquals(ApmSystemManager::ERROR_DATABASE_IS_NOT_INITIALIZED, $sm5->getErrorCode());
        
        // let's use the db connection in the previous test SystemManager to play
        // around with the database version in the test database
        $dbConn = $sm5->getDbConnection();
        $dbBadVersion = $sm5->getDatabaseVersion() - 1;
        $dbConn->query('update ap_settings set `value`=' . $dbBadVersion . ' where `setting`=\'dbversion\'');
        $config[ApmSystemManager::CFG_TABLE_PREFIX] = 'ap_';
        $sm6 = new ApmSystemManager($config);
        $this->assertTrue($sm6->fatalErrorOccurred());
        $this->assertEquals(ApmSystemManager::ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE, $sm6->getErrorCode());
        
        // restore good database version
        $dbConn->query('update ap_settings set `value`=' . $sm6->getDatabaseVersion() . ' where `setting`=\'dbversion\'');
        
        // Bad plugin
        $config[ApmSystemManager::CFG_PLUGINS] = [ 'badplugin'];
        $sm7 = new ApmSystemManager($config);
        $this->assertTrue($sm7->fatalErrorOccurred());
        $this->assertEquals(ApmSystemManager::ERROR_CANNOT_LOAD_PLUGIN, $sm7->getErrorCode());

        // All good
        $config[ApmSystemManager::CFG_PLUGIN_DIR] = 'apm/test-plugins/basic';
        $config[ApmSystemManager::CFG_PLUGINS] = [ 'BasicPlugin'];
        $sm8= new ApmSystemManager($config);
        $this->assertFalse($sm8->fatalErrorOccurred());
        $this->assertEquals(System\SystemManager::MSG_ERROR_NO_ERROR, $sm8->getErrorMsg());
        $this->assertTrue(is_a($sm8->getSettingsManager(), 'APM\System\SettingsManager'));
        $this->assertTrue(is_a($sm8->getPresetsManager(), 'APM\Presets\PresetManager'));
        
        $this->assertFalse($sm8->isToolValid('someToolNotInTheSystem'));
        
    }
}

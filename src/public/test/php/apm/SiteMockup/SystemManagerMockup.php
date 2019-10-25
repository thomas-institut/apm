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


use APM\Presets\PresetManager;
use APM\System\SystemManager;
use APM\System\SettingsManager;
use APM\Plugin\HookManager;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
/**
 * Description of SystemManagerMockup
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SystemManagerMockup extends SystemManager {
    
    private $logger;
    private $hm;
    private $sm;
    
    public function __construct() {
        $logStream = new StreamHandler('test.log', 
            Logger::DEBUG);
        $logger = new Logger('SM_MOCKUP');
        $logger->pushHandler($logStream);
        
        $this->logger = $logger;
        
        $this->hm = new HookManager();
        $this->sm = new SettingsManager();
    }
    
    public function checkSystemSetup() {
        return true;
    }

    public function getLogger() : Logger {
        return $this->logger;
    }

    public function getPresetsManager() : PresetManager {
        return false;
    }

    public function setUpSystem() {
        return true;
    }
    
    public function getHookManager() {
        return $this->hm;
    }

    public function getSettingsManager() {
        return $this->sm;
    }

    public function getCollationEngine()
    {
        // TODO: Implement getCollationEngine() method.
    }
}

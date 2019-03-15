<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
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

    public function getLogger() {
        return $this->logger;
    }

    public function getPresetsManager() {
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

}
